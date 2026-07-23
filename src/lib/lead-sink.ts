// Durable lead delivery — the fail-safe behind /api/book.
//
// WHY THIS EXISTS
// Before this module, /api/book attempted a single GHL upsert and redirected the
// visitor to /thanks no matter what happened. A GHL outage meant the lead was
// gone and the client saw a success page. For a personal-injury firm that is a
// real person who believes a lawyer now has their case. Spec §7 G2 states the
// invariant plainly: never lose a lead to a 500.
//
// THE APPROACH
// No KV/Blob dependency, deliberately. Adding one would make every client
// project provision storage and would add a second thing that can fail. Instead
// we lean on spec §7 G7, which already requires notifying a human on EVERY lead:
// a payload delivered to a human cannot be lost by a CRM outage. Notification is
// therefore not an error path, it is the durability mechanism.
//
// Env vars (optional individually, but at least ONE sink should be configured;
// verifyLeadSinkConfigured() reports when none is):
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID — instant operator alert
//   HUB_LEAD_SINK_URL  + HUB_RPC_SECRET   — POST to the FGA hub for persistence

export type LeadPayload = {
  name: string;
  email: string;
  phone?: string;
  smsConsent: boolean;
  /** Every raw form field, so nothing submitted is ever dropped. */
  fields: Record<string, string>;
  /** Where the form was submitted from. */
  sourceUrl: string;
  submittedAt: string;
  /** Set when the CRM write failed, so a human knows to key it in by hand. */
  crmFailed?: boolean;
  crmError?: string;
};

export type SinkResult = {
  /** True when at least one sink accepted the lead. */
  delivered: boolean;
  succeeded: string[];
  failed: string[];
};

/** Sinks get a hard ceiling so a hanging webhook can never hold the visitor's request open. */
const SINK_TIMEOUT_MS = 4000;

/** True when at least one delivery sink is configured. Surfaced by the build-time check. */
export function verifyLeadSinkConfigured(): boolean {
  const telegram = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
  const hub = Boolean(process.env.HUB_LEAD_SINK_URL && process.env.HUB_RPC_SECRET);
  return telegram || hub;
}

/**
 * Retry an async operation with exponential backoff.
 *
 * `isFailure` exists because upsertContact() signals failure by RESOLVING null
 * rather than throwing. A plain try/catch retry would treat that as success and
 * silently skip every retry, which is the exact class of bug this module fixes.
 */
export async function withRetry<T>(
  op: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number; isFailure?: (value: T) => boolean } = {},
): Promise<{ value: T | null; attempts: number; error?: unknown }> {
  const attempts = opts.attempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  const isFailure = opts.isFailure ?? ((v: T) => v === null || v === undefined);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const value = await op();
      if (!isFailure(value)) return { value, attempts: attempt };
      lastError = new Error("operation reported failure without throwing");
    } catch (err) {
      lastError = err;
    }
    if (attempt < attempts) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
    }
  }
  return { value: null, attempts, error: lastError };
}

function formatLead(lead: LeadPayload, company: string): string {
  const lines: string[] = [];
  lines.push(lead.crmFailed ? `🚨 LEAD (CRM WRITE FAILED) — ${company}` : `📥 New lead — ${company}`);
  if (lead.crmFailed) {
    lines.push("This lead is NOT in the CRM. Enter it by hand and follow up now.");
    if (lead.crmError) lines.push(`Reason: ${lead.crmError}`);
  }
  lines.push("");
  lines.push(`Name: ${lead.name}`);
  lines.push(`Email: ${lead.email}`);
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  lines.push(`SMS consent: ${lead.smsConsent ? "yes" : "no"}`);
  const extras = Object.entries(lead.fields).filter(
    ([k, v]) => v && !["name", "email", "phone", "sms_consent", "website_url"].includes(k),
  );
  if (extras.length) {
    lines.push("");
    for (const [k, v] of extras) lines.push(`${k}: ${v}`);
  }
  lines.push("");
  lines.push(`Submitted: ${lead.submittedAt}`);
  lines.push(`From: ${lead.sourceUrl}`);
  return lines.join("\n");
}

async function sendTelegram(lead: LeadPayload, company: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("telegram not configured");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatLead(lead, company),
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(SINK_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`telegram HTTP ${res.status}`);
}

async function sendHub(lead: LeadPayload, company: string): Promise<void> {
  const url = process.env.HUB_LEAD_SINK_URL;
  const secret = process.env.HUB_RPC_SECRET;
  if (!url || !secret) throw new Error("hub sink not configured");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hub-rpc-secret": secret },
    body: JSON.stringify({ company, lead }),
    signal: AbortSignal.timeout(SINK_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`hub HTTP ${res.status}`);
}

/**
 * Deliver a lead to every configured sink. Sinks run concurrently and
 * independently: one being down must never suppress the others.
 *
 * Never throws. The caller is already in a degraded path and an exception here
 * would be the very failure mode this module exists to prevent.
 */
export async function deliverLead(lead: LeadPayload, company: string): Promise<SinkResult> {
  const sinks: Array<[string, () => Promise<void>]> = [];
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    sinks.push(["telegram", () => sendTelegram(lead, company)]);
  }
  if (process.env.HUB_LEAD_SINK_URL && process.env.HUB_RPC_SECRET) {
    sinks.push(["hub", () => sendHub(lead, company)]);
  }

  const succeeded: string[] = [];
  const failed: string[] = [];

  const results = await Promise.allSettled(sinks.map(([, fn]) => fn()));
  results.forEach((r, i) => {
    const label = sinks[i][0];
    if (r.status === "fulfilled") succeeded.push(label);
    else {
      failed.push(label);
      console.error(`[lead-sink] ${label} delivery failed:`, r.reason);
    }
  });

  return { delivered: succeeded.length > 0, succeeded, failed };
}

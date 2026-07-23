// Tests for the lead fail-safe. Spec §7 G2: never lose a lead to a 500.
//
// Per handoff §D.1, every fix is tested in BOTH directions. Four rounds of UAT
// were lost to fixes that were right in the reported case and wrong in its
// inverse, so a test that only proves "retries on failure" is not enough: it
// must also prove "does NOT retry on success" and "does not report delivered
// when nothing was delivered".
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deliverLead, verifyLeadSinkConfigured, withRetry, type LeadPayload } from "./lead-sink";

const lead: LeadPayload = {
  name: "Test Person",
  email: "test@example.com",
  phone: "+18138004529",
  smsConsent: true,
  fields: { name: "Test Person", email: "test@example.com", message: "hit by a car" },
  sourceUrl: "https://lp.example.com/",
  submittedAt: "2026-07-22T00:00:00.000Z",
};

const ENV_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "HUB_LEAD_SINK_URL",
  "HUB_RPC_SECRET",
] as const;

let savedEnv: Record<string, string | undefined>;

beforeEach(() => {
  savedEnv = {};
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  vi.restoreAllMocks();
});

describe("withRetry", () => {
  it("retries when the operation RESOLVES null, the real upsertContact failure mode", async () => {
    // This is the bug that made the original code lose leads: upsertContact
    // signals failure by resolving null, so a try/catch retry never fires.
    const op = vi.fn(async () => null);
    const res = await withRetry(op, { attempts: 3, baseDelayMs: 1 });
    expect(op).toHaveBeenCalledTimes(3);
    expect(res.value).toBeNull();
    expect(res.attempts).toBe(3);
  });

  it("INVERSE: does not retry when the first attempt succeeds", async () => {
    const op = vi.fn(async () => ({ contactId: "c1", locationId: "l1" }));
    const res = await withRetry(op, { attempts: 3, baseDelayMs: 1 });
    expect(op).toHaveBeenCalledTimes(1);
    expect(res.value).toEqual({ contactId: "c1", locationId: "l1" });
    expect(res.attempts).toBe(1);
  });

  it("recovers when a later attempt succeeds, and stops immediately after", async () => {
    let n = 0;
    const op = vi.fn(async () => (++n < 3 ? null : { contactId: "c1", locationId: "l1" }));
    const res = await withRetry(op, { attempts: 5, baseDelayMs: 1 });
    expect(op).toHaveBeenCalledTimes(3);
    expect(res.value).not.toBeNull();
  });

  it("retries on a thrown error and surfaces the last one", async () => {
    const op = vi.fn(async () => {
      throw new Error("GHL 503");
    });
    const res = await withRetry(op, { attempts: 2, baseDelayMs: 1 });
    expect(op).toHaveBeenCalledTimes(2);
    expect(res.value).toBeNull();
    expect((res.error as Error).message).toBe("GHL 503");
  });

  it("treats a falsy-but-valid value as success, not failure", async () => {
    // Guards the inverse of the null check: 0 and "" are legitimate results.
    const res = await withRetry(async () => 0, { attempts: 3, baseDelayMs: 1 });
    expect(res.value).toBe(0);
    expect(res.attempts).toBe(1);
  });
});

describe("deliverLead", () => {
  it("reports NOT delivered when no sink is configured", async () => {
    // The dangerous inverse: an unconfigured deploy must never look successful.
    const res = await deliverLead(lead, "Example Co");
    expect(res.delivered).toBe(false);
    expect(res.succeeded).toEqual([]);
  });

  it("delivers via telegram when configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "bot-token";
    process.env.TELEGRAM_CHAT_ID = "chat-id";
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const res = await deliverLead(lead, "Example Co");
    expect(res.delivered).toBe(true);
    expect(res.succeeded).toEqual(["telegram"]);
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.text).toContain("test@example.com");
    expect(body.text).toContain("hit by a car");
  });

  it("still delivers when ONE sink is down, because sinks are independent", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "bot-token";
    process.env.TELEGRAM_CHAT_ID = "chat-id";
    process.env.HUB_LEAD_SINK_URL = "https://hub.example.com/api/lead";
    process.env.HUB_RPC_SECRET = "secret";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("telegram")
          ? new Response("nope", { status: 500 })
          : new Response("{}", { status: 200 }),
      ),
    );

    const res = await deliverLead(lead, "Example Co");
    expect(res.delivered).toBe(true);
    expect(res.succeeded).toEqual(["hub"]);
    expect(res.failed).toEqual(["telegram"]);
  });

  it("reports NOT delivered when every sink fails, and never throws", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "bot-token";
    process.env.TELEGRAM_CHAT_ID = "chat-id";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const res = await deliverLead(lead, "Example Co");
    expect(res.delivered).toBe(false);
    expect(res.failed).toEqual(["telegram"]);
  });

  it("marks a CRM-failed lead loudly so a human keys it in by hand", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "bot-token";
    process.env.TELEGRAM_CHAT_ID = "chat-id";
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await deliverLead({ ...lead, crmFailed: true, crmError: "GHL 503" }, "Example Co");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.text).toContain("CRM WRITE FAILED");
    expect(body.text).toContain("GHL 503");
  });

  it("omits the honeypot field from the notification", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "bot-token";
    process.env.TELEGRAM_CHAT_ID = "chat-id";
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await deliverLead({ ...lead, fields: { ...lead.fields, website_url: "spam" } }, "Example Co");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.text).not.toContain("website_url");
  });
});

describe("verifyLeadSinkConfigured", () => {
  it("is false with no sink, true with either one", () => {
    expect(verifyLeadSinkConfigured()).toBe(false);
    process.env.TELEGRAM_BOT_TOKEN = "t";
    process.env.TELEGRAM_CHAT_ID = "c";
    expect(verifyLeadSinkConfigured()).toBe(true);
  });

  it("INVERSE: a half-configured sink does not count as configured", () => {
    // A deploy with a bot token but no chat id would silently deliver nothing.
    process.env.TELEGRAM_BOT_TOKEN = "t";
    expect(verifyLeadSinkConfigured()).toBe(false);
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.HUB_LEAD_SINK_URL = "https://hub.example.com";
    expect(verifyLeadSinkConfigured()).toBe(false);
  });
});

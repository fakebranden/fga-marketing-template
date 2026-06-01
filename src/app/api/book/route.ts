// POST /api/book — booking-form submission handler.
//
// Pipeline:
//   1. Parse FormData from the homepage request form.
//   2. Upsert a GHL contact at the configured location (env GHL_LOCATION_ID +
//      GHL_LOCATION_TOKEN). Dedupe is by email on the GHL side.
//   3. Add a Note to that contact containing every event-detail field
//      (event_date, event_type, guest_count, service_area, event_address,
//      message) PLUS a `--- SMS Opt-In ---` audit-trail block.
//   4. Tag with default + niche-specific + SMS Opt-In (if checkbox) tags.
//   5. Redirect the browser to /thanks regardless of GHL outcome (the
//      submission body is always logged to Vercel runtime logs as a backstop
//      so we never silently drop a request).
//
// If GHL env vars are missing, the form still "succeeds" from the user's
// perspective and the full submission is dumped to console.error so the
// operator can recover it from Vercel logs until the token is wired up.

import { NextResponse } from "next/server";
import { addNote, addTags, upsertContact, type GhlCustomFieldValue } from "@/lib/ghl";
import brand from "../../../../brand-config.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function splitName(full: string): { firstName: string; lastName?: string } {
  const trimmed = full.trim();
  if (!trimmed) return { firstName: "Lead" };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function buildNote(
  fields: Record<string, string>,
  smsConsent: boolean,
  consentMeta: { timestamp: string; sourceUrl: string },
): string {
  const lines: string[] = [`Booking request submitted via ${brand.company} website.`, ""];
  const labelMap: Record<string, string> = {
    event_date: "Event / Project Date",
    event_type: "Event / Project Type",
    guest_count: "Guest Count",
    service_area: "Service Area",
    event_address: "Event Address",
    message: "Notes from Requester",
  };
  for (const [key, label] of Object.entries(labelMap)) {
    const v = (fields[key] ?? "").trim();
    if (v) lines.push(`${label}: ${v}`);
  }
  lines.push("");
  lines.push(`Submitted: ${new Date().toISOString()}`);

  // A2P SMS opt-in audit trail. Captured whether or not consent was given —
  // a 'No' record proves we did NOT receive consent if it's ever audited.
  const sendingEntity = brand.dba && brand.dba !== brand.legal_entity
    ? `${brand.legal_entity} (${brand.dba})`
    : brand.legal_entity;
  lines.push("");
  lines.push("--- SMS Opt-In ---");
  if (smsConsent) {
    lines.push(
      `Consent: GRANTED for SMS marketing & informational messages from ${sendingEntity}`,
    );
    lines.push(`Consent timestamp: ${consentMeta.timestamp}`);
    lines.push(`Consent source: ${consentMeta.sourceUrl}`);
    lines.push(
      `Consent text: "By checking this box and providing my phone number, I consent to receive recurring informational and promotional text messages from ${sendingEntity} at the number provided, including via automated technology. Message frequency varies. Message and data rates may apply. Consent is not a condition of purchase. Reply STOP to unsubscribe at any time, or HELP for assistance."`,
    );
  } else {
    lines.push("Consent: NOT GRANTED (checkbox unchecked or absent)");
    lines.push("Do not send marketing SMS to this contact without explicit opt-in.");
  }

  return lines.join("\n");
}

function buildCustomFields(
  fields: Record<string, string>,
): GhlCustomFieldValue[] {
  const out: GhlCustomFieldValue[] = [];
  const fieldId = brand.ghl?.custom_field_event_service_area_id ?? "";
  if (!fieldId) return out;
  const sa = (fields.service_area ?? "").trim();
  const allowed = new Set(brand.ghl?.service_area_options ?? []);
  if (sa && allowed.has(sa)) {
    out.push({ id: fieldId, value: sa });
  }
  return out;
}

export async function POST(req: Request) {
  const form = await req.formData();
  const fields: Record<string, string> = {};
  for (const [k, v] of form.entries()) {
    if (typeof v === "string") fields[k] = v;
  }

  // Honeypot — bots often fill every field. Skip if hidden trap is populated.
  if ((fields["website_url"] ?? "").trim().length > 0) {
    return NextResponse.redirect(new URL("/thanks", req.url), { status: 303 });
  }

  const name = fields.name ?? "";
  const email = fields.email ?? "";
  if (!email || !name) {
    return NextResponse.json(
      { error: "Name and email are required." },
      { status: 400 },
    );
  }

  const { firstName, lastName } = splitName(name);
  const eventType = (fields.event_type ?? "").trim();
  const serviceArea = (fields.service_area ?? "").trim();
  const smsConsent = (fields.sms_consent ?? "").trim().toLowerCase() === "yes";
  const consentMeta = {
    timestamp: new Date().toISOString(),
    sourceUrl: new URL(req.url).origin + "/",
  };
  const defaultTags = brand.ghl?.tags?.default ?? ["Website Booking", "Website Lead"];
  const smsTag = brand.ghl?.tags?.sms_opt_in ?? "SMS Opt-In";
  const tags = [...defaultTags];
  if (eventType) {
    tags.push(`Event Type: ${eventType.split("/")[0].trim().slice(0, 40)}`);
  }
  if (serviceArea) {
    tags.push(`Service Area: ${serviceArea.slice(0, 40)}`);
  }
  // A2P-compliant: only flag for SMS marketing when the user explicitly
  // checked the consent box.
  if (smsConsent) {
    tags.push(smsTag);
  }
  const customFields = buildCustomFields(fields);

  // Always log the submission first — backstop so a GHL outage never loses a lead.
  console.log("[booking] form submission", { name, email, smsConsent, fields });

  try {
    const upsert = await upsertContact({
      firstName,
      lastName,
      email,
      phone: fields.phone || undefined,
      source: `Website Booking Form — ${brand.company}`,
      tags,
      customFields,
    });

    if (upsert) {
      await Promise.allSettled([
        addNote(upsert.contactId, buildNote(fields, smsConsent, consentMeta)),
        addTags(upsert.contactId, tags),
      ]);
      console.log(
        "[booking] GHL upsert ok",
        { contactId: upsert.contactId, locationId: upsert.locationId },
      );
    } else {
      console.error("[booking] GHL upsert returned null — submission only in Vercel logs:", {
        name,
        email,
        fields,
      });
    }
  } catch (err) {
    console.error("[booking] GHL flow threw — submission only in Vercel logs:", err, {
      name,
      email,
      fields,
    });
  }

  return NextResponse.redirect(new URL("/thanks", req.url), {
    status: 303,
  });
}

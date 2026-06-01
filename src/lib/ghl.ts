// GoHighLevel contact helpers — booking-form pipeline.
//
// Env vars (set in Vercel project):
//   GHL_LOCATION_ID         — Sub-account location id for the client
//   GHL_LOCATION_TOKEN      — Private Integration token scoped to that location
//                             (Sub-account → Settings → Private Integrations →
//                             Create with scopes:
//                               contacts.write
//                               contacts/notes.write
//                               contacts/tags.write)
//
// API: LeadConnector v2 — https://services.leadconnectorhq.com
// Header Version: 2021-07-28

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

function authHeaders(): Record<string, string> {
  const token = process.env.GHL_LOCATION_TOKEN;
  if (!token) throw new Error("GHL_LOCATION_TOKEN env var missing");
  return {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
  };
}

export type GhlCustomFieldValue = {
  id: string;
  /** Plain value for SINGLE_OPTIONS / TEXT / NUMBER etc. */
  value: string;
};

export type UpsertContactInput = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  source?: string;
  tags?: string[];
  customFields?: GhlCustomFieldValue[];
};

export async function upsertContact(
  input: UpsertContactInput,
): Promise<{ contactId: string; locationId: string } | null> {
  const locationId = process.env.GHL_LOCATION_ID;
  if (!locationId) throw new Error("GHL_LOCATION_ID env var missing");

  const lastName = input.lastName ?? "";
  const body: Record<string, unknown> = {
    firstName: input.firstName,
    lastName,
    name: `${input.firstName} ${lastName}`.trim(),
    email: input.email,
    locationId,
    source: input.source ?? "Website Booking Form",
    tags: input.tags ?? ["Website Booking", "Website Lead"],
  };
  if (input.phone) body.phone = input.phone;
  if (input.customFields && input.customFields.length > 0) {
    body.customFields = input.customFields;
  }

  const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    console.error("[ghl] upsert failed:", res.status, t);
    return null;
  }
  const json = (await res.json()) as { contact?: { id?: string } };
  const id = json.contact?.id;
  return id ? { contactId: id, locationId } : null;
}

export async function addNote(contactId: string, body: string): Promise<void> {
  if (!body) return;
  try {
    const res = await fetch(`${GHL_BASE}/contacts/${contactId}/notes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ body }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[ghl] addNote failed:", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[ghl] addNote threw:", err);
  }
}

export async function addTags(
  contactId: string,
  tags: string[],
): Promise<void> {
  if (!tags.length) return;
  try {
    await fetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ tags }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[ghl] addTags threw:", err);
  }
}

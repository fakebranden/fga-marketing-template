#!/usr/bin/env node
/**
 * ghl-preflight.mjs — Phase 6 pre-generation guard.
 *
 * Runs BEFORE generate-pages.mjs (so it fails before the Claude Agent SDK burns
 * tokens) and validates the two things that silently sink a client launch:
 *
 *   1. A2P compliance data is real (per reference_sms_a2p_compliance):
 *      when a2p.enabled is true, legal_entity / dba / a2p.sample_messages must
 *      be present AND not the template "Example Client" placeholders. Twilio
 *      reviewers match the site's SMS Terms §6.2 verbatim against the registered
 *      campaign samples — placeholder text = campaign rejection.
 *
 *   2. GHL booking routing resolves: if ghl.location_id is set and a GHL token
 *      is available, GET the location to confirm token+location are valid (so
 *      the booking form actually lands leads). Empty location_id → warn (booking
 *      won't route). Token absent at build time → warn (verified at runtime).
 *
 * Reads the EFFECTIVE brand-config (template defaults + site.brand overrides,
 * same merge generate-pages.mjs performs) so it judges what will actually ship.
 *
 * Exit 1 on any hard failure (fails the build); exit 0 with warnings otherwise.
 * Usage: node scripts/ghl-preflight.mjs <site.json-path>
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const sitePath = process.argv[2] || "site.json";

const brand = JSON.parse(readFileSync(join(ROOT, "brand-config.json"), "utf-8"));
let site = {};
if (existsSync(sitePath)) {
  try { site = JSON.parse(readFileSync(sitePath, "utf-8")); } catch { site = {}; }
}
// Same merge generate-pages.mjs does.
const eff = { ...brand, ...(site.brand || {}) };
if (site.niche) eff.niche = site.niche;
const a2p = eff.a2p || {};
const ghl = eff.ghl || {};

const fails = [];
const warns = [];

const PLACEHOLDER = /example client/i;
const isPlaceholder = (s) => !s || PLACEHOLDER.test(String(s));

const smsEnabled = a2p.enabled === true;

if (smsEnabled) {
  if (isPlaceholder(eff.legal_entity))
    fails.push("a2p.enabled but legal_entity is missing/placeholder — set the real Twilio-registered legal entity.");
  if (isPlaceholder(eff.dba))
    fails.push("a2p.enabled but dba is missing/placeholder — set the client's DBA/brand name.");
  const samples = Array.isArray(a2p.sample_messages) ? a2p.sample_messages.filter(Boolean) : [];
  if (samples.length < 1)
    fails.push("a2p.enabled but a2p.sample_messages is empty — required so SMS Terms §6.2 matches the carrier filing.");
  else if (samples.some(isPlaceholder))
    fails.push("a2p.sample_messages still contains the 'Example Client' placeholder — replace with the registered campaign samples verbatim.");
  if (!ghl.location_id)
    warns.push("a2p.enabled but ghl.location_id is empty — SMS opt-ins won't route to GHL until set.");
} else {
  console.log("[ghl-preflight] a2p.enabled is false — skipping A2P content checks (site does not send SMS).");
}

// Med-spa legal gate (known-issue #6): state-by-state "results"/drug-name TM
// copy floor requires operator legal sign-off before the first prod site.
// Generation is blocked until the brand kit carries legal_review_passed: true.
if (eff.niche === "med-spa-aesthetic" && eff.legal_review_passed !== true) {
  fails.push(
    "niche=med-spa-aesthetic requires operator legal sign-off (state-by-state 'results' claims + drug-name trademark floor). " +
      "Set legal_review_passed:true in the brand kit after review. See reasoning/med-spa-aesthetic.md.",
  );
}

// GHL connectivity (best-effort).
const token = process.env.GHL_API_TOKEN || process.env.GHL_FGA_TOKEN || "";
if (ghl.location_id) {
  if (!token) {
    warns.push(`ghl.location_id set (${ghl.location_id}) but no GHL token at build time — booking routing verified at runtime only.`);
  } else {
    try {
      const res = await fetch(`https://services.leadconnectorhq.com/locations/${ghl.location_id}`, {
        headers: { Authorization: `Bearer ${token}`, Version: "2021-07-28" },
      });
      if (!res.ok) fails.push(`GHL location ${ghl.location_id} did not resolve (HTTP ${res.status}) — check GHL token + location_id.`);
      else console.log(`[ghl-preflight] GHL location ${ghl.location_id} resolved OK.`);
    } catch (e) {
      warns.push(`GHL location check errored (${e.message || e}) — network/runtime; not blocking.`);
    }
  }
} else if (!smsEnabled) {
  warns.push("ghl.location_id is empty — booking form will not route leads to GHL.");
}

for (const w of warns) console.warn(`[ghl-preflight] WARN: ${w}`);

if (fails.length) {
  console.error("[ghl-preflight] FAIL — pre-generation guard:");
  for (const f of fails) console.error(`  - ${f}`);
  console.error("\nFix the brand kit / marketing-site record (legal_entity, dba, a2p.sample_messages, ghl.location_id) and re-run. See reference_sms_a2p_compliance.");
  process.exit(1);
}
console.log(`[ghl-preflight] OK — niche=${eff.niche || "?"} a2p.enabled=${smsEnabled} ${warns.length} warning(s).`);
process.exit(0);

#!/usr/bin/env node
/**
 * enforce-canonical.mjs — Build-blocking check that the site knows its own URL.
 *
 * Rule:
 *   `brand-config.json.canonical_url` must be a real absolute https URL that is
 *   not a placeholder. It feeds seo.ts's canonical(), and from there:
 *     - metadataBase and <link rel="canonical"> on every page
 *     - og:url and the JSON-LD @graph node ids
 *     - robots.txt `Host:` and `Sitemap:`
 *     - the address printed in the /privacy and /terms copy
 *
 * WHY THIS EXISTS
 *   The template default is "https://example.com" and, until 2026-07-30, nothing
 *   in the pipeline overwrote it: the hub sends brand-KIT facts, and a site's URL
 *   is not a brand-kit fact. So every generated site shipped
 *   `<link rel="canonical" href="https://example.com">`. Measured live that day on
 *   two real client sites, dyre-athletics-marketing and franchi-law-marketing,
 *   both also serving `Sitemap: https://example.com/sitemap.xml`.
 *
 *   A canonical pointing at a domain we do not own tells search engines the
 *   client's page is a duplicate of someone else's, which can suppress indexing
 *   of the whole site. It is invisible in the rendered page, so nobody looking at
 *   the lander would ever catch it. That is exactly the class of defect that
 *   needs a gate rather than a habit.
 *
 * generate-pages.mjs now derives canonical_url from the hub record. This check is
 * the backstop for the case where that derivation did not run or could not
 * resolve, so the failure is loud at build time instead of silent in production.
 *
 * On violation: prints the reason and exits 1 (fails the build).
 * On a clean config: prints the resolved URL and exits 0.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG = join(ROOT, "brand-config.json");

// Hosts reserved by RFC 2606 / RFC 6761 for documentation and examples, plus the
// template's own stand-in. None can ever be a real client site.
const PLACEHOLDER_HOSTS = new Set([
  "example.com",
  "www.example.com",
  "example.org",
  "example.net",
  "localhost",
  "yourdomain.com",
  "changeme.com",
]);

function fail(msg) {
  console.error(`[enforce-canonical] ${msg}`);
  console.error(
    "[enforce-canonical] brand-config.json.canonical_url must be the site's real " +
      "absolute URL. generate-pages.mjs derives it from the hub record " +
      "(custom_domain > live_url > vercel_project). If you are building this " +
      "template directly rather than a generated client site, set it locally.",
  );
  process.exit(1);
}

let brand;
try {
  brand = JSON.parse(readFileSync(CONFIG, "utf-8"));
} catch (e) {
  fail(`could not read brand-config.json: ${e.message}`);
}

const raw = brand.canonical_url;
if (typeof raw !== "string" || !raw.trim()) fail("canonical_url is missing or empty");

let url;
try {
  url = new URL(raw.trim());
} catch {
  fail(`canonical_url is not a valid absolute URL: ${JSON.stringify(raw)}`);
}

if (url.protocol !== "https:") {
  fail(`canonical_url must be https, got ${url.protocol.replace(":", "")}: ${url.href}`);
}

const host = url.hostname.toLowerCase();
if (PLACEHOLDER_HOSTS.has(host)) {
  fail(
    `canonical_url is still the placeholder ${url.href} — the generated site would ` +
      "tell search engines every page is a duplicate of a domain we do not own",
  );
}

// A bare "example" style host with no dot is never a deployable site either.
if (!host.includes(".")) fail(`canonical_url host is not a real domain: ${url.href}`);

console.log(`[enforce-canonical] ok · canonical_url = ${url.origin}`);

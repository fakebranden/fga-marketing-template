#!/usr/bin/env node
/**
 * enforce-a2p.mjs — Build-blocking A2P SMS compliance check (v3).
 *
 * Rule (per reference_sms_a2p_compliance + template CLAUDE.md hard rules):
 *   Every PHONE-COLLECTING input on the site must live in a file that also
 *   imports + uses <SmsConsent />, and that file must NOT render <ChatWidget />.
 *   Carriers reject A2P campaigns whose opt-in forms don't surface the visible
 *   consent disclosure + checkbox, so this blocks the build the moment we drift.
 *
 * v2 hardening over v1 (which only caught a single-line `<input type="tel">`):
 *   - Tag-by-tag scan of every <input> AND shadcn <Input> element, multiline-safe.
 *   - Phone collection detected via ANY of: type=tel, inputMode=tel,
 *     autoComplete=tel*, or a name/id whose value contains phone|tel|mobile|cell.
 *     Closes the "form collects phone without type='tel'" evasion (known-issue #5).
 *   - ChatWidget A2P gate: <ChatWidget /> MUST NOT render on a page that also
 *     collects a phone number (template CLAUDE.md hard rule #4).
 *   - Conservative: a positive phone signal is required to flag, so a dynamic
 *     `type={expr}` input with no phone-ish attribute is NOT a false positive.
 *
 * v3 addition: the consent block must also be LEGIBLE, not merely present.
 *   `checkConsentContrast()` scores brand-config.json colors.ink against
 *   colors.surface_soft — the one pairing sms-consent.tsx paints the entire
 *   block with — and fails the build below 4.5:1. Added after a live client
 *   shipped both A2P links at 1.00:1. See the comment on that function.
 *
 * On violation: prints `${file}:${line} — <reason>` and exits 1 (fails build).
 * On clean tree: prints an audit summary and exits 0.
 *
 * Wired into `npm run build` via package.json + run explicitly in
 * generate-marketing.yml so the build fails before the Agent SDK burns tokens.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { contrastRatio } from "./lib/contrast.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");

// Every <input ...> / <Input ...> tag (self-closing or not), multiline-safe.
// [^>] includes newlines, so attributes spread across lines are captured.
const INPUT_TAG_RE = /<[Ii]nput\b[^>]*?>/g;

// Phone-collection signals that take an exact `tel` value.
const TEL_VALUE_SIGNALS = [
  /\btype\s*=\s*['"]tel['"]/i,
  /\binputmode\s*=\s*['"]tel['"]/i,
  /\bautocomplete\s*=\s*['"]tel[^'"]*['"]/i,
];
// name=/id= attribute values are tokenized (camelCase + separators) and matched
// against this set, so `phoneNumber`/`mobilePhone`/`user_phone` are caught while
// `automobile`/`hotel`/`cancellation` are NOT false-positived.
const NAME_ID_RE = /\b(?:name|id)\s*=\s*['"]([^'"]+)['"]/gi;
const PHONE_TOKENS = new Set([
  "phone", "telephone", "tel", "mobile", "cell",
  "cellphone", "mobilephone", "phonenumber", "mobilenumber",
]);
function tokenize(value) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase hump → boundary
    .split(/[^a-zA-Z]+/) // non-letters → boundary (snake_case, kebab-case)
    .map((t) => t.toLowerCase())
    .filter(Boolean);
}

const SMS_CONSENT_IMPORT_RE = /\bimport\b[^;]*\bSmsConsent\b[^;]*;/;
const SMS_CONSENT_USAGE_RE = /<SmsConsent\b/;
const CHATWIDGET_USAGE_RE = /<ChatWidget\b/;

/* ───────────────────────────────────────────────────────────────────────────
 * v3: consent-block legibility gate.
 *
 * A2P requires the SMS Terms + Privacy links to be present AND legible at the
 * point of consent. Presence was already gated above; legibility was not, and
 * on 2026-08-03 fga-marketing-site-dyre-athletics was found shipping both
 * links at 1.00:1 — invisible — because they were painted with `--primary`,
 * a surface/fill token that happened to equal that brand's `--surface-soft`.
 *
 * sms-consent.tsx now paints the whole block, links included, with `--ink` on
 * `--surface-soft`. That collapses the whole question to ONE pairing, which is
 * what this gate checks. If it passes, every character in the consent block —
 * heading, prose and both links — clears WCAG AA for normal text, because they
 * are all the same two colours.
 *
 * Threshold 4.5:1: the block renders at 13px, which is normal text, so the 3:1
 * large-text allowance does not apply. This is the same floor and the same
 * pairing as RENDERED_PAIRS' "body text on alt section" in lib/contrast.mjs.
 *
 * WHY HERE AND NOT ONLY IN generate-pages.mjs: that pipeline already runs
 * `enforcePaletteContrast()`, which REPAIRS this pairing — but only at
 * GENERATION time. A brand-config.json hand-edited after generation (which is
 * exactly how the DYRE palette reached its shipped state) never passes through
 * it again. This runs on every build, so a hand edit cannot ship an illegible
 * consent block. The WCAG maths is imported, not re-implemented, so there is
 * one contrast implementation in this repo and it keeps its 33 unit tests.
 * ─────────────────────────────────────────────────────────────────────────── */
const CONSENT_MIN_CONTRAST = 4.5;

// Returns a violation object, or null when it passes / cannot be evaluated.
// Deliberately fails OPEN on a missing or unparseable config: this gate exists
// to catch a bad colour PAIRING, and turning it into a second "config must
// exist" check would make an unrelated failure mode look like a contrast bug.
function checkConsentContrast() {
  let brand;
  try {
    brand = JSON.parse(readFileSync(join(ROOT, "brand-config.json"), "utf8"));
  } catch {
    console.log("[enforce-a2p] brand-config.json unreadable — consent contrast check skipped");
    return null;
  }
  const ink = brand?.colors?.ink;
  const surface = brand?.colors?.surface_soft;
  if (typeof ink !== "string" || typeof surface !== "string") {
    console.log("[enforce-a2p] colors.ink / colors.surface_soft not both set — consent contrast check skipped");
    return null;
  }
  const ratio = contrastRatio(ink, surface);
  if (ratio === null) {
    console.log(`[enforce-a2p] colors.ink (${ink}) / colors.surface_soft (${surface}) not both hex — consent contrast check skipped`);
    return null;
  }
  const rounded = Math.round(ratio * 100) / 100;
  if (ratio >= CONSENT_MIN_CONTRAST) {
    console.log(`[enforce-a2p] consent block contrast ${rounded}:1 (ink ${ink} on surface_soft ${surface}) — OK`);
    return null;
  }
  return {
    file: "brand-config.json",
    line: 1,
    reason:
      `SMS consent block would render at ${rounded}:1 — colors.ink (${ink}) on colors.surface_soft (${surface}) ` +
      `is below the ${CONSENT_MIN_CONTRAST}:1 WCAG AA floor for 13px text. The consent disclosure and its ` +
      `SMS Terms / Privacy links would be illegible, which carriers reject.`,
  };
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      walk(full, acc);
    } else if (st.isFile()) {
      if (/\.(ts|tsx)$/.test(name)) acc.push(full);
    }
  }
  return acc;
}

function lineOfIndex(src, index) {
  return src.slice(0, index).split("\n").length;
}

function isPhoneInput(tag) {
  if (TEL_VALUE_SIGNALS.some((re) => re.test(tag))) return true;
  for (const m of tag.matchAll(NAME_ID_RE)) {
    if (tokenize(m[1]).some((t) => PHONE_TOKENS.has(t))) return true;
  }
  return false;
}

function main() {
  let files;
  try {
    files = walk(SRC);
  } catch {
    console.log("[enforce-a2p] no src/ directory — skipped");
    process.exit(0);
  }

  const violations = [];
  let phoneInputCount = 0;
  let filesWithPhone = 0;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    const rel = relative(ROOT, file);

    // Find phone-collecting input tags in this file.
    const phoneTags = [];
    for (const m of src.matchAll(INPUT_TAG_RE)) {
      if (isPhoneInput(m[0])) phoneTags.push({ index: m.index, line: lineOfIndex(src, m.index) });
    }
    if (phoneTags.length === 0) continue;

    filesWithPhone += 1;
    phoneInputCount += phoneTags.length;

    const hasImport = SMS_CONSENT_IMPORT_RE.test(src);
    const hasUsage = SMS_CONSENT_USAGE_RE.test(src);
    const firstLine = phoneTags[0].line;

    if (!hasImport || !hasUsage) {
      violations.push({
        file: rel,
        line: firstLine,
        reason: !hasImport
          ? "phone-collecting input without `import { SmsConsent } from '@/components/sms-consent'`"
          : "phone-collecting input — SmsConsent imported but `<SmsConsent />` not rendered",
      });
    }

    // ChatWidget A2P gate (template CLAUDE.md hard rule #4).
    if (CHATWIDGET_USAGE_RE.test(src)) {
      const cwIdx = src.search(CHATWIDGET_USAGE_RE);
      violations.push({
        file: rel,
        line: lineOfIndex(src, cwIdx),
        reason: "<ChatWidget /> renders on a page that collects a phone number — A2P prohibits this (move ChatWidget to /about, /terms, or /privacy)",
      });
    }
  }

  const contrastViolation = checkConsentContrast();
  if (contrastViolation) violations.push(contrastViolation);

  if (violations.length > 0) {
    console.error("[enforce-a2p] FAIL — A2P SMS compliance violation(s):");
    for (const v of violations) console.error(`  ${v.file}:${v.line} — ${v.reason}`);
    console.error("");
    console.error(
      "Fix: every phone-collecting form must import { SmsConsent } and render <SmsConsent /> in the same file, " +
        "and must NOT render <ChatWidget /> on that page.",
    );
    console.error(
      "See: reference_sms_a2p_compliance — A2P requires the visible consent block on every phone-collecting form.",
    );
    process.exit(1);
  }

  console.log(
    `[enforce-a2p] OK — ${phoneInputCount} phone input(s) across ${filesWithPhone} file(s) audited, all compliant`,
  );
  process.exit(0);
}

main();

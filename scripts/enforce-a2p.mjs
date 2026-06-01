#!/usr/bin/env node
/**
 * enforce-a2p.mjs — Build-blocking A2P SMS compliance check.
 *
 * Rule (per reference_sms_a2p_compliance memory):
 *   Every <input type="tel"> on the site must live in a file that also
 *   imports + uses <SmsConsent />. Carriers reject A2P campaigns whose
 *   opt-in forms don't render the visible consent disclosure + checkbox,
 *   so this script blocks the build the moment we drift.
 *
 * Scope:
 *   Walks src/**\/*.{ts,tsx} (excluding node_modules, .next).
 *   For each file containing `<input type="tel"` (or `type='tel'`), confirm:
 *     1. The file imports SmsConsent (default or named import)
 *     2. The file references `<SmsConsent` in its JSX
 *
 * On violation:
 *   - Prints `${file}:${line} — tel input without SmsConsent`
 *   - Exits with code 1 so `npm run build` fails fast.
 *
 * On clean tree:
 *   - Prints `[enforce-a2p] OK — N tel input(s) audited, all compliant`
 *   - Exits 0.
 *
 * Usage:
 *   node scripts/enforce-a2p.mjs
 *
 * Wired into `npm run build` via package.json scripts. CI also runs it
 * explicitly via the generate-marketing.yml workflow so the build can
 * fail before the Claude Agent SDK call burns tokens on broken output.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = join(ROOT, "src");

const TEL_INPUT_RE = /<input\b[^>]*\btype\s*=\s*['"]tel['"]/;
const SMS_CONSENT_IMPORT_RE = /\bimport\b[^;]*\bSmsConsent\b[^;]*;/;
const SMS_CONSENT_USAGE_RE = /<SmsConsent\b/;

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

function findLineNumber(src, regex) {
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return 1;
}

function main() {
  let files;
  try {
    files = walk(SRC);
  } catch (err) {
    // src/ missing — nothing to audit (e.g. fresh template before scaffold).
    console.log("[enforce-a2p] no src/ directory — skipped");
    process.exit(0);
  }

  const violations = [];
  let telInputCount = 0;

  for (const file of files) {
    const src = readFileSync(file, "utf8");
    if (!TEL_INPUT_RE.test(src)) continue;
    telInputCount += 1;
    const hasImport = SMS_CONSENT_IMPORT_RE.test(src);
    const hasUsage = SMS_CONSENT_USAGE_RE.test(src);
    if (hasImport && hasUsage) continue;
    const line = findLineNumber(src, TEL_INPUT_RE);
    const rel = relative(ROOT, file);
    const reason = !hasImport
      ? "missing `import { SmsConsent } from ...`"
      : "missing `<SmsConsent />` in JSX";
    violations.push({ file: rel, line, reason });
  }

  if (violations.length > 0) {
    console.error("[enforce-a2p] FAIL — A2P SMS compliance violation(s):");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line} — tel input without SmsConsent (${v.reason})`);
    }
    console.error("");
    console.error(
      "Fix: import { SmsConsent } from '@/components/sms-consent' and render <SmsConsent /> inside the form that collects the phone number.",
    );
    console.error(
      "See: reference_sms_a2p_compliance — A2P submission requires every phone-collecting form to surface the visible consent block.",
    );
    process.exit(1);
  }

  console.log(
    `[enforce-a2p] OK — ${telInputCount} tel input(s) audited, all compliant`,
  );
  process.exit(0);
}

main();

#!/usr/bin/env node
// Writes src/lander/MANIFEST.json — a sha256 per file of the canonical registry.
//
// This is the anchor for the anti-drift gate. The hub vendors src/lander/** and
// verifies its copy against this manifest; a mismatch fails the hub build. The
// spec names registry drift the main engineering risk of the project, so the
// check is a hash comparison rather than a convention nobody enforces.
//
// Run `node scripts/lander-manifest.mjs` after ANY change under src/lander/.
// `--check` verifies without writing, which is what CI runs.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DIR = join(ROOT, "src/lander");
const MANIFEST = join(DIR, "MANIFEST.json");
const check = process.argv.includes("--check");

/** Files that make up the vendored contract. Tests stay OUT: the hub runs its own
 *  suite against its own copy, and shipping a test file would drag vitest types
 *  into the hub's build graph. */
function collect(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) { out.push(...collect(full)); continue; }
    if (entry === "MANIFEST.json") continue;
    if (/\.test\.(ts|tsx|mjs)$/.test(entry)) continue;
    if (!/\.(ts|tsx)$/.test(entry)) continue;
    out.push(full);
  }
  return out.sort();
}

const files = collect(DIR);
if (files.length === 0) {
  console.error("[lander-manifest] no files found under src/lander");
  process.exit(1);
}

const entries = {};
for (const f of files) {
  const rel = relative(DIR, f);
  // Normalise line endings so a checkout on another platform does not read as drift.
  const body = readFileSync(f, "utf8").replace(/\r\n/g, "\n");
  entries[rel] = createHash("sha256").update(body).digest("hex");
}
const manifest = { version: 1, files: entries };
const serialised = JSON.stringify(manifest, null, 2) + "\n";

if (check) {
  let current = null;
  try { current = readFileSync(MANIFEST, "utf8"); } catch { /* missing */ }
  if (current !== serialised) {
    console.error("[lander-manifest] MANIFEST.json is STALE. src/lander/ changed without regenerating it.");
    console.error("  Fix: node scripts/lander-manifest.mjs");
    process.exit(1);
  }
  console.log(`[lander-manifest] OK — ${files.length} files, manifest current.`);
  process.exit(0);
}

writeFileSync(MANIFEST, serialised);
console.log(`[lander-manifest] wrote ${files.length} hashes to src/lander/MANIFEST.json`);

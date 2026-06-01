#!/usr/bin/env node
/**
 * install-registry-deps.mjs
 *
 * Reads the FGA Pro Max registry manifest + section recipes, figures out
 * which shadcn-registry components a given niche needs, and runs
 * `pnpm dlx shadcn@latest add <url>` for each one.
 *
 * Designed to be run from inside fga-marketing-template (the target repo)
 * — NOT from inside the skill repo itself.
 *
 * Usage:
 *   node scripts/install-registry-deps.mjs --niche lounge
 *   node scripts/install-registry-deps.mjs --niche restaurant-bar --dry-run
 *   node scripts/install-registry-deps.mjs \
 *     --niche barber-salon \
 *     --registry-manifest /path/to/registry/manifest.json \
 *     --recipes /path/to/recipes/sections.json
 *
 * Behavior:
 *   1. Loads manifest + recipes
 *   2. Walks the recipe table; for each non-vendored entry, parses
 *      <library>:<component> tokens
 *   3. Resolves the registry URL via the manifest's registryUrlPattern
 *   4. Skips components already present at components/ui/<name>.tsx
 *      (idempotent)
 *   5. Streams pnpm output for visibility
 *   6. Records every successful install in .fga-pro-max-installed.json
 *      for fast re-runs
 *   7. Exits 0 on success / 1 on any install failure
 *
 * Tier semantics:
 *   - 'default-bundle' libraries (cult-ui, aceternity) are always candidates
 *   - 'on-demand' libraries are only installed if a section in the resolved
 *      recipe references them
 *
 * The --niche flag is currently advisory — the recipe table is shared
 * across niches in Phase 2. Niche-conditional recipes ship in Phase 5.
 */

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(SCRIPT_DIR, "..");
const INSTALL_LOG = ".fga-pro-max-installed.json";

// ─── CLI parse ────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") { args.dryRun = true; continue; }
    if (a === "--help" || a === "-h") { args.help = true; continue; }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1];
      if (val === undefined || val.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = val;
        i++;
      }
    }
  }
  return args;
}

function usage() {
  console.log(`
install-registry-deps — install shadcn-registry components for an FGA niche

USAGE
  node scripts/install-registry-deps.mjs --niche <slug> [options]

REQUIRED
  --niche <slug>             Niche slug (e.g. lounge, restaurant-bar)

OPTIONS
  --registry-manifest <path> Path to registry/manifest.json (default: skill repo's)
  --recipes <path>           Path to recipes/sections.json (default: skill repo's)
  --dry-run                  Print commands without executing
  --target-dir <dir>         Working directory (default: process.cwd())
  --help, -h                 Show this message

EXAMPLES
  # From inside fga-marketing-template
  node scripts/install-registry-deps.mjs --niche lounge

  # Dry-run from anywhere
  node /path/to/install-registry-deps.mjs --niche barber-salon --dry-run
`);
}

const args = parseArgs(process.argv);

if (args.help) {
  usage();
  process.exit(0);
}

if (!args.niche) {
  console.error("✖ --niche is required");
  usage();
  process.exit(1);
}

const manifestPath = args["registry-manifest"]
  ? resolve(args["registry-manifest"])
  : join(SKILL_ROOT, "registry/manifest.json");

const recipesPath = args["recipes"]
  ? resolve(args["recipes"])
  : join(SKILL_ROOT, "recipes/sections.json");

const targetDir = args["target-dir"]
  ? resolve(args["target-dir"])
  : process.cwd();

const dryRun = !!args.dryRun;

// ─── Load manifest + recipes ──────────────────────────────────────────
function loadJson(p) {
  if (!existsSync(p)) {
    console.error(`✖ Missing: ${p}`);
    process.exit(1);
  }
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch (e) {
    console.error(`✖ Malformed JSON ${p}: ${e.message}`);
    process.exit(1);
  }
}

const manifest = loadJson(manifestPath);
const recipes = loadJson(recipesPath);

// ─── Resolve install set ──────────────────────────────────────────────
// For each section, look at default first; fall back if default token
// is a phase2:tbd. (Shouldn't happen post-Phase-2 but defend in code.)
const toInstall = [];           // [{ library, component, url, section, role }]
const skippedVendored = [];     // sections owned by template
const skippedTbd = [];          // unresolved placeholders (build error)

for (const [sectionName, recipe] of Object.entries(recipes.sections)) {
  for (const role of ["default", "fallback"]) {
    const token = recipe[role];
    if (!token) continue;
    if (typeof token !== "string") continue;
    if (token.startsWith("phase2:") || token.startsWith("phase")) {
      skippedTbd.push({ section: sectionName, role, token });
      continue;
    }
    if (token.startsWith("vendored:")) {
      skippedVendored.push({ section: sectionName, role, token });
      continue;
    }
    const [library, component] = token.split(":");
    if (!library || !component) {
      console.error(`✖ Malformed token "${token}" in section "${sectionName}.${role}"`);
      process.exit(1);
    }
    const libEntry = manifest.libraries?.[library];
    if (!libEntry) {
      console.error(`✖ Unknown library "${library}" referenced in section "${sectionName}.${role}"`);
      process.exit(1);
    }
    const pattern = libEntry.registryUrlPattern;
    if (!pattern) {
      console.error(`✖ Library "${library}" missing registryUrlPattern in manifest`);
      process.exit(1);
    }
    const url = pattern.replace("<name>", component);
    toInstall.push({ library, component, url, section: sectionName, role });
  }
}

// Deduplicate (same component referenced as default + fallback elsewhere)
const seen = new Set();
const dedupedInstall = [];
for (const item of toInstall) {
  const key = `${item.library}:${item.component}`;
  if (seen.has(key)) continue;
  seen.add(key);
  dedupedInstall.push(item);
}

// ─── Existing-install cache ───────────────────────────────────────────
const logPath = join(targetDir, INSTALL_LOG);
let installLog = { installedAt: null, components: {} };
if (existsSync(logPath)) {
  try {
    installLog = JSON.parse(readFileSync(logPath, "utf-8"));
  } catch {
    // Corrupt? ignore + overwrite at end.
  }
}

function isAlreadyInstalled(component) {
  // Two signals: presence in the install log, OR the file on disk.
  if (installLog.components?.[component]) return true;
  const candidates = [
    join(targetDir, "components/ui", `${component}.tsx`),
    join(targetDir, "components/ui", `${component}.ts`),
    join(targetDir, "src/components/ui", `${component}.tsx`),
    join(targetDir, "src/components/ui", `${component}.ts`),
  ];
  return candidates.some(existsSync);
}

// ─── Banner ───────────────────────────────────────────────────────────
console.log(`\nFGA Pro Max — install-registry-deps`);
console.log("─".repeat(50));
console.log(`Niche:     ${args.niche}`);
console.log(`Target:    ${targetDir}`);
console.log(`Manifest:  ${manifestPath}`);
console.log(`Recipes:   ${recipesPath}`);
console.log(`Dry-run:   ${dryRun}`);
console.log("");

if (skippedVendored.length) {
  console.log(`Vendored (skip):`);
  for (const s of skippedVendored) {
    console.log(`  · ${s.section}.${s.role} = ${s.token}`);
  }
  console.log("");
}

if (skippedTbd.length) {
  console.log(`⚠ Unresolved phase2:tbd placeholders (build-error candidates):`);
  for (const s of skippedTbd) {
    console.log(`  · ${s.section}.${s.role} = ${s.token}`);
  }
  console.log("");
}

console.log(`Components to consider (${dedupedInstall.length}):`);
for (const item of dedupedInstall) {
  const status = isAlreadyInstalled(item.component) ? "skip (exists)" : "install";
  console.log(`  · [${status}] ${item.library}:${item.component} → ${item.url}`);
}
console.log("");

// ─── Run installs ─────────────────────────────────────────────────────
async function runShadcnAdd(url) {
  return new Promise((resolveProc, reject) => {
    const cmd = "pnpm";
    const cmdArgs = ["dlx", "shadcn@latest", "add", url, "--yes"];
    if (dryRun) {
      console.log(`  [dry-run] ${cmd} ${cmdArgs.join(" ")}`);
      resolveProc(0);
      return;
    }
    const child = spawn(cmd, cmdArgs, {
      cwd: targetDir,
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("exit", code => {
      if (code === 0) resolveProc(0);
      else reject(new Error(`pnpm dlx shadcn add ${url} exited with code ${code}`));
    });
  });
}

let installed = 0;
let skippedExisting = 0;
const librariesTouched = new Set();
const failures = [];

for (const item of dedupedInstall) {
  if (isAlreadyInstalled(item.component)) {
    skippedExisting++;
    librariesTouched.add(item.library);
    installLog.components[item.component] = {
      library: item.library,
      url: item.url,
      via: "pre-existing",
      at: installLog.components[item.component]?.at ?? new Date().toISOString(),
    };
    continue;
  }
  console.log(`▸ installing ${item.library}:${item.component}`);
  try {
    await runShadcnAdd(item.url);
    if (!dryRun) {
      installed++;
      librariesTouched.add(item.library);
      installLog.components[item.component] = {
        library: item.library,
        url: item.url,
        via: "shadcn-cli",
        at: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.error(`  ✖ ${err.message}`);
    failures.push({ ...item, error: err.message });
  }
}

// ─── Persist install log ──────────────────────────────────────────────
if (!dryRun) {
  installLog.installedAt = new Date().toISOString();
  installLog.niche = args.niche;
  writeFileSync(logPath, JSON.stringify(installLog, null, 2) + "\n", "utf-8");
}

// ─── Summary + exit ───────────────────────────────────────────────────
console.log("");
console.log("─".repeat(50));
if (dryRun) {
  console.log(`Dry-run complete. Would touch ${dedupedInstall.length} components from ${new Set(dedupedInstall.map(i => i.library)).size} libraries.`);
} else {
  console.log(`Installed ${installed} new component(s) (${skippedExisting} pre-existing) from ${librariesTouched.size} library/libraries.`);
}

if (skippedTbd.length) {
  console.error(`✖ ${skippedTbd.length} recipe entry/entries still hold phase2:tbd placeholders — recipe table incomplete.`);
  process.exit(1);
}

if (failures.length) {
  console.error(`\n✖ ${failures.length} install failure(s):`);
  for (const f of failures) {
    console.error(`  · ${f.library}:${f.component} (${f.url})`);
    console.error(`    ${f.error}`);
  }
  process.exit(1);
}

console.log("✓ done");
process.exit(0);

// Loads the published LanderSpec from content/lander.json at build time.
//
// The file is COMMITTED INTO THE CLIENT REPO by the hub's publish step, so the
// deployed site renders from it with no Redis and no network at runtime — which
// is what makes a publish deterministic and a rollback a git revert.
//
// Absence is a normal state, not an error: a client repo that has never been
// through the editor has no lander.json and falls back to the brand-config-driven
// SotyHome composition. So this returns null rather than throwing, and a
// malformed file degrades the same way instead of taking down the build.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSpec, migrateSpec, type LanderSpec } from "@/lander/schema";

export type LoadedLander =
  | { spec: LanderSpec; warnings: string[] }
  | null;

let cached: LoadedLander | undefined;

export function loadLanderSpec(): LoadedLander {
  if (cached !== undefined) return cached;
  cached = read();
  return cached;
}

function read(): LoadedLander {
  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), "content", "lander.json"), "utf8");
  } catch {
    return null; // no published spec — brand-config composition stands
  }
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.warn(`[lander] content/lander.json is not valid JSON, ignoring: ${(err as Error).message}`);
    return null;
  }
  const result = parseSpec(migrateSpec(json));
  if (!result.ok) {
    // Loud, because a published spec that fails validation means the publish path
    // let something through, and silently serving the fallback would hide that.
    console.warn(`[lander] content/lander.json failed validation, ignoring: ${result.errors.join("; ")}`);
    return null;
  }
  if (result.warnings.length) {
    console.warn(`[lander] content/lander.json loaded with warnings: ${result.warnings.join("; ")}`);
  }
  return { spec: result.spec, warnings: result.warnings };
}

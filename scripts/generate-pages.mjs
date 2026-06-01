#!/usr/bin/env node
/**
 * generate-pages.mjs — Phase 5e wires this. Currently a no-op stub so the
 * end-to-end workflow (generate-marketing.yml) runs cleanly through every
 * step without failing at the Claude Agent SDK call.
 *
 * Planned behavior (Phase 5e):
 *   - Read site.json (pulled from hub by the GH Actions step)
 *   - Resolve niche from site.json.niche
 *   - Load fga-pro-max-skill reasoning rules for that niche
 *   - For each page (home, about, terms, privacy, plus any niche-required
 *     extras like /menu for restaurant-bar), call Claude with the per-page
 *     prompt from AGENTS.md
 *   - Write src/app/<page>/page.tsx + brand-config.json mutations
 *   - Verify TypeScript still compiles after each write
 *
 * Until Phase 5e ships, this stub keeps the pipeline functional — running
 * an unparameterized template against a brand-config.json that's already
 * been swapped in by the workflow is enough to produce a working (if
 * generic-looking) site.
 */
console.log("[generate-pages] Phase 5e wires this — pending");
console.log("[generate-pages] template will deploy as-is with brand-config.json overrides");
process.exit(0);

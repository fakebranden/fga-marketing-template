# fga-marketing-template — Contributor Guide

You are working on the **FGA marketing-site template** — the destination
repo that `fga-pro-max-skill` consumes to generate per-client marketing
sites. This is the artifact that hosts the production code.

## What this repo is

A **runnable Next.js 16 / React 19 / Tailwind v4** project that builds and
deploys as-is, with all client-specific content driven by `brand-config.json`.
The Generate-Site pipeline spawns per-client repos from this template and
overwrites `brand-config.json` (plus optionally per-page TSX via the Claude
Agent SDK) before deploying.

## Hard rules

1. **`brand-config.json` is the single source of truth.** No client-specific
   strings, hex values, URLs, phone numbers, emails, or service-area names
   may appear in any other file. Every consumer reads from brand-config.json.
2. **A2P compliance is build-blocking.** `scripts/enforce-a2p.mjs` runs as
   part of `npm run build` and on every PR via CI. Any `<input type="tel">`
   without a same-file `<SmsConsent />` import + usage fails the build with
   exit code 1.
3. **/terms and /privacy SMS sections are LOCKED.** Carriers (Twilio A2P
   reviewers) match the exact prose of section 4.1–4.8 (terms) and the
   "Mobile Information and SMS Opt-In Data" block (privacy) against the
   campaign registration. Per-client edits to those sections are NEVER OK
   without re-registering the A2P campaign first.
4. **ChatWidget A2P gate.** `<ChatWidget />` MUST NOT render on any page
   that contains `<input type="tel">`. Default safe placements: /about,
   /terms, /privacy. Default excluded: / (booking form), /thanks.
5. **No auto-deploy on consumer repos.** `fga-marketing-site-*` repos do NOT
   trigger Vercel on git push (per `reference_client_site_deploys`). The
   Generate-Site pipeline triggers deploys explicitly via the Vercel API in
   Phase 6.
6. **Vercel git author lock.** Commits that should ship to Vercel must be
   authored as `201860651+fakebranden@users.noreply.github.com` (the
   GitHub-verified noreply for the `fakebranden` account). Other author
   emails cause Vercel deployments to land in `BLOCKED` state (per
   `feedback_git_email_vercel_block`).

## File-level responsibilities

| Path | Owner | Notes |
|---|---|---|
| `brand-config.json` | Generate-Site pipeline | Overwritten per client. Schema is authoritative. |
| `src/lib/seo.ts` | Skill maintainer | Niche subtype lookup table. Update in lockstep with `fga-pro-max-skill/reasoning/_taxonomy.json`. |
| `src/lib/ghl.ts` | Skill maintainer | GHL v2 API client. Should rarely change. |
| `src/components/sms-consent.tsx` | Skill maintainer | A2P-compliant consent block. NEVER delete. |
| `src/app/terms/page.tsx` | Compliance | SMS Terms locked. Re-register carrier campaign before editing. |
| `src/app/privacy/page.tsx` | Compliance | Same lock. |
| `src/app/api/book/route.ts` | Skill maintainer | A2P audit trail logged in GHL note. |
| `scripts/enforce-a2p.mjs` | Skill maintainer | Build gate. Failing this drops deploys. |
| `scripts/generate-pages.mjs` | Phase 5e maintainer | Currently a stub. Phase 5e wires the Claude Agent SDK driver. |
| `scripts/trigger-vercel-deploy.mjs` | Phase 6 maintainer | Currently a stub. Phase 6 wires the Vercel API caller. |
| `.github/workflows/generate-marketing.yml` | Pipeline maintainer | Driven by `WF-MARKETING-SITE-GEN`. |
| `AGENTS.md` | Phase 5e maintainer | Per-page prompts for `generate-pages.mjs`. |

## Branching + release

- `main` is always green (`npm run build` passes, A2P check passes).
- Each phase = a release: `v0.1.0` (Phase 5a — this template), `v0.2.0`
  (Phase 5e — Claude Agent SDK wiring), `v0.3.0` (Phase 6 — Vercel auto-deploy).
- Tag a phase complete only after operator sign-off.

## Per-client repo lifecycle

```
WF-MARKETING-SITE-GEN (n8n)
  → POST /repos/fakebranden/fga-marketing-template/generate
  → fga-marketing-site-<slug> repo created
  → workflow_dispatch generate-marketing.yml
  → GH Actions checks out, fetches brand kit from hub
  → npm ci
  → node scripts/generate-pages.mjs  (Phase 5e — currently a stub)
  → node scripts/enforce-a2p.mjs      (build-blocking)
  → npm run build                     (smoke)
  → git commit (as fakebranden noreply) + push
  → node scripts/trigger-vercel-deploy.mjs  (Phase 6 — currently a stub)
  → PATCH hub /api/employee-hub/marketing-site/<slug>  status=live + live_url
```

## When you're patching this template

Before changing anything:

1. **Read the vault memory** that owns the area you're touching:
   - Touching A2P → `reference_sms_a2p_compliance`
   - Touching SEO/JSON-LD → `reference_seo_aeo_site_baseline`
   - Touching the pipeline → `reference_generate_site_button_implementation`
   - Touching Vercel auto-deploy → `reference_client_site_deploys` + `reference_fga_proposal_site_pipeline`
2. **Verify `brand-config.json` shape is unchanged.** If you need to add a
   field, update the README schema example + the seo.ts/ghl.ts/etc.
   consumers in the same patch.
3. **Run `npm run build` locally.** A2P check + Next.js build must both
   pass before pushing.
4. **Trace dependencies.** Per `feedback_analyze_dependencies_before_changing`,
   check every consumer of the field/component you're touching. Don't break
   working functions by missing a dependency.

## Cross-references

- `fakebranden/fga-pro-max-skill` — the skill that owns niche reasoning,
  design tokens, and per-page prompts. Updates to this template must
  match the recipes there.
- `fga-ai-demo` — hub UI + AI site editor at `/employee-hub/sites/[slug]/editor`.
  The editor edits per-client `fga-marketing-site-*` repos AFTER they ship.
- `fga-client-template` — the PROPOSAL-site template (different shape:
  Plan/Budget/Calendar/Systems pages). Don't conflate the two.
- Vault memories: `project_fga_pro_max_skill`, `reference_generate_site_button_implementation`,
  `reference_seo_aeo_site_baseline`, `reference_sms_a2p_compliance`,
  `reference_fga_proposal_site_pipeline`, `reference_client_site_deploys`,
  `feedback_git_email_vercel_block`.

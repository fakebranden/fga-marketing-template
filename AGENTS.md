<!-- BEGIN:fga-deploy-rules -->
# How to ship a change (read this first)

**Commit straight to `main`. That publishes the site. Nothing else is needed.**

A GitHub Actions workflow (`.github/workflows/deploy.yml`) watches `main` and
deploys to production automatically, usually within about two minutes. You do
not need anyone to click anything.

## What you must do

- Commit your change **directly to `main`** and push it.
- Then tell the user, in one line, that the change is pushed and the site will
  be live in a couple of minutes.

## What you must NOT do

- **Do not run any `vercel` command.** Not `vercel deploy`, not `vercel pull`,
  not `vercel build`. The deploy token in this repo is scoped to this one
  project and those commands will fail. Deployment is not your job.
- **Do not open a pull request and stop, waiting for a human to merge it.** The
  user is not going to open GitHub. If you leave the work in a PR, it never
  ships.
- **Do not say deployment is impossible, blocked, or needs the site owner.** It
  is automatic. Pushing to `main` is the entire deploy process.
- Do not add `vercel pull` or `--prebuilt` to the deploy workflow. They require
  broader access than this repo's token has and will break the deploy.

## Before you commit

Run these and make sure they pass, because the deploy runs the same build and a
failure means nothing ships:

```bash
npx tsc --noEmit     # must be clean
npm run build        # runs the A2P compliance gate, then the Next build
```

`npm run build` starts with `node scripts/enforce-a2p.mjs`, which **fails on
purpose** if a page collects a phone number without rendering `<SmsConsent />`.
If it fires, add the consent block. Never weaken or bypass that check.

## If something goes wrong

If the build fails, fix it and push again. Report the actual error to the user
in plain language. Do not tell them to deploy manually and do not tell them to
contact Vercel.
<!-- END:fga-deploy-rules -->

# AGENTS.md — Per-page prompt templates for the Generate-Site pipeline

> **OUTDATED for the home page (Phase 5e SOTY model).** The driver no longer
> generates `src/app/page.tsx` from scratch. The home is a FIXED SOTY composition
> filled by a JSON **content** block (see `prompts/README.md` + `prompts/home.md`).
> The driver writes `brand-config.json` only and never touches `src/app/**.tsx`.
> The `/about`, `/book`, `/thanks` TSX-generation sections below are **dormant**
> (those ship as template defaults). The `/terms` + `/privacy` DO-NOT-REGENERATE
> locks below are still authoritative and enforced by construction.

This file is consumed by `scripts/generate-pages.mjs` (Phase 5e) when the
Claude Agent SDK regenerates a marketing site per client. Each page has one
prompt section below. The Generate-Site workflow:

1. Reads `site.json` (pulled from the hub) → resolves `niche`, `brand_kit`,
   `service_areas`, etc.
2. Loads `fga-pro-max-skill/reasoning/<niche>.md` for niche-specific guidance.
3. For each page below, sends the Anthropic API one call with structured
   output, expecting a `src/app/<page>/page.tsx` file in the response.
4. Writes the file. Runs `tsc --noEmit` to catch syntax errors.
5. Repeats until all pages pass.

## Shared context (injected into every per-page call)

```
You are generating a single page for {company}'s marketing site. The site
inherits a fixed design system from globals.css — never invent new colors,
fonts, or component primitives. The vendored components you may import are:

- @/components/site-header.tsx (already in layout — do not re-render)
- @/components/site-footer.tsx (already in layout)
- @/components/json-ld.tsx
- @/components/sms-consent.tsx (MUST render on any page with <input type="tel">)
- @/components/chat-widget.tsx (MUST NOT render on any page with <input type="tel">)
- @/components/brand-mark.tsx
- @/components/socials.tsx
- @/components/hero-video.tsx (only when a hero video is supplied)

Brand kit:
{brand_config_json}

Niche reasoning rules:
{niche_reasoning_md}

Service areas:
{service_areas_list}

HARD CONSTRAINTS:
- Use CSS variables from globals.css only: --primary, --primary-dark, --accent,
  --accent-dark, --surface, --surface-soft, --ink, --ink-soft, --line.
- Headlines use font-display (Fraunces / brand display font).
- Body uses font-body (Inter / brand body font).
- Eyebrows are italic + uppercase + tracking-[0.04em], colored with accent.
- Every page must emit a pageMeta() call for SEO.
- FAQ section on HOME ONLY — required for AEO compliance.
- A2P: never render <input type="tel"> without <SmsConsent /> in the same file.
- Never invent prices, addresses, hours, or stats not in brand-config.json.
- Output ONE complete TSX file. No markdown around it. No prose before/after.
```

## Page: `/` (home — request-quote form)

```
You are generating src/app/page.tsx — the marketing site's home page.

This is the PRIMARY conversion page. The booking form IS the home page —
visitors land directly on it. Required sections in order:

1. HERO with primary-color background, eyebrow ("Request a Quote" or
   niche-appropriate variant), H1 from {tagline}, optional subtitle.
2. FORM + SIDEBAR section (cream/surface-soft background, two-column grid):
   - Form fields: name, email, phone, event_date, guest_count, event_type,
     service_area (SelectField from {service_area_options}), event_address,
     message (textarea). Plus an absolute-positioned `website_url` honeypot.
   - SmsConsent component (mandatory).
   - Submit button "Send Request" (or niche-appropriate variant) with btn-accent.
   - Sidebar: "How it works" (3 steps), "Service Area" (from {service_areas}),
     "Prefer to call?" (from {brand.contact.phone, brand.contact.email}).
3. FAQ section (6-10 entries from {faqs}, rendered as <details>/<summary>).

The form posts to /api/book and the page renders <JsonLd data={serviceGraph()} />
+ <JsonLd data={faqGraph(faqs)} /> in the tree.
```

## Page: `/about`

```
You are generating src/app/about/page.tsx — the about / story page.

Sections in order:
1. HERO with primary-color background, H1 "About {company}" or niche variant
2. STORY section with brand description, niche-appropriate "what we do" copy
3. (Optional) STATS block — only if brand-kit supplies real numbers
4. CTA strip linking back to / for booking

Render <ChatWidget /> at the top of the JSX (safe — no phone form on this page).
```

## Page: `/terms`

```
DO NOT REGENERATE. The base /terms page is locked — it ships the legal entity
(brand.legal_entity) and SMS Terms section 6.1-6.8 verbatim because carriers
match these exact strings against the A2P submission. The Generate-Site
pipeline must NEVER rewrite this page's prose.

Only update if brand-config.json `a2p.sample_messages` changes — and even
then, only via a code path that re-runs the carrier A2P registration.
```

## Page: `/privacy`

```
DO NOT REGENERATE. Same lock as /terms — the Mobile Information & SMS Opt-In
Data section is the #1 A2P-rejection trigger, and its prose has been audited
against multiple carrier reviewers. The Generate-Site pipeline must NEVER
rewrite this page's prose.
```

## Page: `/thanks`

```
You may regenerate /thanks per client only to swap brand voice. Required
elements: success icon, "Request Received" eyebrow, H1, body paragraph,
optional "back to about" link, optional phone/email fallback block.
robots: { index: false, follow: false } stays unconditional.
```

## Niche-specific extra pages

Per fga-pro-max-skill/reasoning/<niche>.md, certain niches add pages:

- `restaurant-bar` → `/menu` (Menu + MenuSection + MenuItem schema)
- `appliance-retail` → `/catalog` + product detail pages
- `agency-b2b` → `/services` + case-study pages
- `med-spa-aesthetic` → `/services` + treatment pages

The Generate-Site workflow detects the niche, picks the extra pages from the
reasoning file, and runs additional Claude calls with similar prompts.

## Quality gates (every generated file passes through)

1. `tsc --noEmit` — must compile clean
2. `node scripts/enforce-a2p.mjs` — A2P compliance check
3. `npm run build` — full Next.js production build
4. ESLint clean (no errors; warnings OK)

If any gate fails, the Generate-Site workflow retries with the failure
message appended to the prompt context. Three retries max per page before
the workflow callbacks the hub with status=failed.

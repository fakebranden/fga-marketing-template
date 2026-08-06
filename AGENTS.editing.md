# AGENTS.editing.md — Human-directed editing sessions

**Read this before your first prompt in this repo.** It governs interactive
editing sessions (Codex, Claude Code, or a human in an editor).

> **Not to be confused with `AGENTS.md`**, which contains per-page prompts for
> the automated `scripts/generate-pages.mjs` pipeline and whose header is
> explicitly marked **OUTDATED for the home page**. That file describes machine
> regeneration. It is not instructions for you. Do not follow it.
>
> **`CLAUDE.md` also reads oddly here.** It describes `fga-marketing-template`,
> the upstream template repo. This repo is a *generated per-client instance*
> spawned from it. Its "Hard rules" section still applies; its repo-lifecycle
> and release sections describe the template, not this site.

---

## What this repo is

**One client's marketing site**, generated from `fga-marketing-template`.

- Next.js 16 / React 19 / Tailwind v4
- Which client it is, and every client-specific value, comes from
  `brand-config.json`. Read that file first — it tells you the company name,
  colors, phone number, service areas, and canonical URL.
- Deployed to Vercel by **GitHub Actions** (`.github/workflows/deploy.yml`):
  - **Merge to `main` → production deploy.** Automatic. No further action.
  - **Open a PR → preview deploy.** The URL is in the run's summary.

That means you **can** break the live site from this repo. A bad merge to `main`
ships. The checks below are how that gets caught, and they are not optional.

Watch the **Actions** tab after merging. If the `Deploy` run is green, the change
is live; if it is red, open it and read the failing step — the error is real and
the deploy did not happen. The most common cause is the A2P compliance gate
below, which fails the build on purpose.

Do not run `vercel` yourself and do not add `vercel pull` or `--prebuilt` to the
workflow; the deploy token is scoped to this one project and those commands need
broader access, so they fail with "Could not retrieve Project Settings".

---

## Hard locks — compliance, not preferences

These exist because carriers and regulators check them. Breaking one can cost
the client their SMS campaign registration, not just a bad build.

### 1. A2P: phone collection requires a consent block

`scripts/enforce-a2p.mjs` runs as the first half of `npm run build` and
**exits 1 on violation**, failing the build.

Any file that collects a phone number MUST import and render `<SmsConsent />`.
The script detects phone collection via **any** of:

- `type="tel"`
- `inputMode="tel"`
- `autoComplete="tel*"`
- a `name` or `id` containing `phone`, `telephone`, `tel`, `mobile`, or `cell`

You cannot evade it by dropping `type="tel"` — that hole is closed. Do not try
to route around this check. If it fires, the fix is to add the consent block,
never to weaken the detector.

### 2. ChatWidget must not co-exist with phone collection

`<ChatWidget />` MUST NOT render on any page that also collects a phone number.
Same script, same build failure.

- Safe placements: `/about`, `/terms`, `/privacy`
- Excluded: `/` (booking form), `/thanks`

### 3. `/terms` and `/privacy` SMS sections are frozen

Twilio A2P reviewers match the **exact prose** of sections 4.1–4.8 in
`src/app/terms/page.tsx` and the "Mobile Information and SMS Opt-In Data" block
in `src/app/privacy/page.tsx` against the campaign registration.

**Never edit that prose.** Changing a word can invalidate the registration.
Copy fixes, typo fixes, and "improvements" are all prohibited. If a change is
genuinely required, the A2P campaign must be re-registered *first* — that is an
operator decision, not a session decision.

### 4. `brand-config.json` is the single source of truth

No client-specific strings, hex values, URLs, phone numbers, emails, or
service-area names may appear in any other file. Every consumer reads from
`brand-config.json`. If you need a new field, update the README schema example
and every consumer in the same change.

### 5. Design system is fixed

Never invent colors, fonts, or component primitives. They come from
`globals.css` and `brand-config.json`. The home page is a fixed composition
filled by a content block — edit its **content**, not its structure.

---

## Your SEO / AEO / GEO surface

These are the files you will actually be editing. Everything you need is
exported from `src/lib/seo.ts` — use the helpers, don't hand-roll tags.

| File | What lives there |
|---|---|
| `src/lib/seo.ts` | `pageMeta(path, title, description)`, `canonical(path)`, `siteGraph()`, `faqGraph(entries)`, `serviceGraph()`, `membershipOfferGraph(offers)`, `ID` |
| `src/components/json-ld.tsx` | renders the schema graph into a page |
| `src/app/sitemap.ts` | sitemap generation |
| `src/app/robots.ts` | robots rules, AI crawler directives |
| `public/llms.txt`, `public/llms-full.txt` | AEO/GEO surface for answer engines |
| `src/app/*/page.tsx` | headings, copy, on-page content |

**Conventions**

- Every page exports metadata via `pageMeta()`. Do not write a raw
  `export const metadata` object.
- Every page renders exactly one canonical. `canonical()` builds it from
  `brand.canonical_url` — never hardcode a domain.
- FAQ content goes through `faqGraph()` so it emits valid `FAQPage` schema.
  Question/answer text must match what a user actually sees on the page —
  schema that doesn't match visible content is a manual-action risk.
- `llms.txt` should stay in sync with the site's real structure and offers.
  It is a summary for answer engines, not a keyword dump.

---

## Workflow

```bash
# ... make changes on main ...
npx tsc --noEmit                            # must be clean
npm run build                               # runs A2P gate, then next build
npm run dev                                 # verify visually
git commit -am "<what changed and why>"
git push origin main                        # this publishes the site
```

Pushing to `main` triggers the deploy. There is no merge step and nobody needs
to click anything. Do not leave finished work sitting in a pull request; the
person who asked for it is not going to open GitHub to merge it.

### Definition of done

A change is not done until **all** of these pass:

1. `npx tsc --noEmit` — no errors
2. `npm run build` — A2P gate passes AND Next build succeeds
3. Visually verified at `localhost` — not assumed from the diff
4. No file outside your stated scope was modified

State the evidence in the PR description. "Should work" is not evidence.

---

## Never

- `git push --force` anything
- Leave finished work in a pull request waiting for a human to merge it
- Tell the user deployment is blocked, impossible, or needs the site owner
- Put real values in `.env.local` (blank is correct — the booking form falls
  back to logging submissions locally instead of hitting the live CRM)
- Run any `vercel` command
- Edit `/terms` or `/privacy` SMS prose
- Modify or bypass `scripts/enforce-a2p.mjs`
- Delete `src/components/sms-consent.tsx`
- Commit `node_modules`, `.env*`, or build output

---

## Git identity

Set this once, repo-local, before your first commit:

```bash
git config user.name "<your-github-username>"
git config user.email "<your-github-noreply-email>"
```

Get your noreply address from GitHub → Settings → Emails.

Use your real one. Deploys no longer depend on it — Actions handles those — but
history, blame, and PR attribution do, and a commit email that maps to no GitHub
account shows up as an unlinked ghost author forever.

Do not set this globally, and do not use someone else's identity.

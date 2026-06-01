# fga-marketing-template

FGA's marketing-site template repo. Niche-tuned, brand-kit-locked,
GHL + A2P + Vercel-wired. Consumed by
[`fakebranden/fga-pro-max-skill`](https://github.com/fakebranden/fga-pro-max-skill)
to generate per-client marketing sites.

## How to use

This is a GitHub template repo. Spawn a per-client repo via:

```bash
gh repo create fakebranden/fga-marketing-site-<slug> \
  --public \
  --template fakebranden/fga-marketing-template \
  --description "Marketing site for <client>"
```

Or programmatically via the GitHub API (this is what the n8n workflow
`WF-MARKETING-SITE-GEN` does):

```
POST /repos/fakebranden/fga-marketing-template/generate
{
  "owner": "fakebranden",
  "name": "fga-marketing-site-<slug>"
}
```

## What ships in this template

```
fga-marketing-template/
├── .github/workflows/
│   └── generate-marketing.yml      # GH Actions — driven by WF-MARKETING-SITE-GEN
├── AGENTS.md                       # Per-page prompt templates (Phase 5e)
├── CLAUDE.md                       # Contributor guide for Claude Code
├── brand-config.json               # Single source of truth — overwritten per client
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── public/
│   ├── brand/                      # logo, favicon, og-default, niche imagery
│   ├── llms.txt                    # AEO index (regenerated per client at build)
│   └── llms-full.txt
├── scripts/
│   ├── enforce-a2p.mjs             # Build-blocking A2P SMS compliance check
│   ├── generate-pages.mjs          # Phase 5e — Claude Agent SDK driver (stub)
│   ├── trigger-vercel-deploy.mjs   # Phase 6 — Vercel deploy trigger (stub)
│   ├── install-registry-deps.mjs   # shadcn-registry component installer (from fga-pro-max-skill)
│   └── extract-tokens.mjs          # Playwright design-token extractor (from fga-pro-max-skill)
└── src/
    ├── app/
    │   ├── layout.tsx              # Entity-graph JSON-LD, font wiring, sticky header/footer
    │   ├── page.tsx                # Home — request-quote form + FAQ + JSON-LD
    │   ├── about/page.tsx
    │   ├── thanks/page.tsx         # Post-submit landing (noindex)
    │   ├── terms/page.tsx          # FULL SMS Terms 4.1–4.8 (do not regenerate per client)
    │   ├── privacy/page.tsx        # Mobile-info carve-out (do not regenerate per client)
    │   ├── sitemap.ts
    │   ├── robots.ts
    │   ├── globals.css             # Semantic CSS vars driven by brand-config.json
    │   └── api/book/route.ts       # GHL contacts upsert + SMS opt-in audit-trail note
    ├── components/
    │   ├── site-header.tsx         # Sticky brand header with optional nav
    │   ├── site-footer.tsx         # Brand footer with socials + contact
    │   ├── brand-mark.tsx          # White-on-transparent wordmark
    │   ├── chat-widget.tsx         # GHL chat widget (A2P-gated — never on phone-form pages)
    │   ├── sms-consent.tsx         # CTIA-compliant consent block
    │   ├── socials.tsx             # IG/FB/TikTok/YouTube/LinkedIn icon row
    │   ├── hero-video.tsx          # Dual-resolution autoplay video
    │   ├── json-ld.tsx             # JSON-LD script-tag emitter
    │   └── reveal.tsx              # IntersectionObserver fade-up wrapper
    └── lib/
        ├── seo.ts                  # JSON-LD helpers + niche-subtype LocalBusiness graph
        ├── ghl.ts                  # GHL upsertContact / addNote / addTags
        └── nav.ts                  # NAV + FOOTER_LINKS — empty by default
```

## brand-config.json — the single source of truth

Every consumer of this template reads `brand-config.json`. The Generate-Site
pipeline overwrites this file (and only this file) when scaffolding a new
client repo from the template. Required shape:

```json
{
  "company": "Client display name",
  "legal_entity": "Client Legal LLC",
  "dba": "Client DBA",
  "niche": "mobile-food-truck",     // one of the 9 fga-pro-max-skill niches
  "canonical_url": "https://client.com",
  "contact": { "phone": "...", "email": "...", "address_locality": "...", "address_region": "..." },
  "socials": { "instagram": "...", "facebook": "...", "tiktok": "..." },
  "colors": { "primary": "#...", "accent": "#...", ... },
  "fonts": { "display": "...", "body": "..." },
  "service_areas": ["Area One", "Area Two"],
  "faqs": [{ "q": "...", "a": "..." }],
  "a2p": { "enabled": true, "sample_messages": [...] },
  "ghl": { "location_id": "...", "service_area_options": [...], "chat_widget_id": "..." }
}
```

See `brand-config.json` in the repo root for the full default placeholder.

## Hard rules every generated site inherits

From [seo-aeo-site-baseline](https://github.com/fakebranden/fga-pro-max-skill):
- sitemap.ts + robots.ts
- LocalBusiness JSON-LD with niche subtype
- FAQPage on home
- llms.txt + llms-full.txt
- pageMeta() per page

From [sms-a2p-compliance](https://github.com/fakebranden/fga-pro-max-skill):
- `<SmsConsent />` on every form with `<input type="tel">` (enforced by
  `scripts/enforce-a2p.mjs` at build time)
- /api/book audit-trail logging
- /privacy "Mobile Information and SMS Opt-In Data" section
- /terms full SMS Terms section 4.1–4.8

## Build

```bash
npm install
npm run build           # runs enforce-a2p then next build
npm run enforce:a2p     # standalone A2P compliance check
```

## Vercel deployment

`fga-marketing-site-*` consumer repos do NOT auto-deploy on git push (per
`reference_client_site_deploys` — the Vercel git integration must be wired
manually by the Generate-Site pipeline in Phase 6). For now, trigger a
deploy with `vercel deploy --prod` on the consumer repo.

## Origin

Seeded by sanitizing `fga-site-travelin-toms-coffee` (2026-05-26) into a
brand-agnostic template. All client-specific copy was lifted into
`brand-config.json` slots.

## Related

- [`fakebranden/fga-pro-max-skill`](https://github.com/fakebranden/fga-pro-max-skill) — the skill that owns the taste layer
- [`fakebranden/fga-client-template`](https://github.com/fakebranden/fga-client-template) — the proposal-site template (different shape — proposal not marketing)
- [`fga-ai-demo`](https://github.com/fakebranden/fga-ai-demo) — the hub UI + API routes that orchestrate generation

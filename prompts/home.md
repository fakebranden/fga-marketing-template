# Per-page contract: HOME (/)

You are generating the home page for {{business_name}}'s marketing site.

## Required sections (in order)

1. `<HeroVideo />` hero — full-bleed autoplay video w/ text overlay, primary CTA
2. "What We Offer" — 3-4 category tiles tied to the niche's service vocabulary
3. Social proof strip — 1 line + logo row OR a stats triplet
4. "Bring Us To You" / "Find Us" section — niche-appropriate (catering for food, service-area map for trades, locations for retail)
5. **FAQ section** (6-8 conversational Q&A pairs) — REQUIRED for AEO compliance; render as visible `<details>/<summary>` HTML AND emit FAQPage JSON-LD via `<JsonLd data={faqGraph(brand.faqs)} />`
6. Footer CTA strip

## Hard constraints

- Hero `<h1>` MUST be the value proposition, NOT the company name
- Every page must emit page-level JSON-LD via the `<JsonLd />` component from `@/components/json-ld`
- Section eyebrows use `var(--font-display)` italic
- Colors come from `brand-config.json` `colors{}` — NEVER invent new hex
- Headlines use `brand.fonts.display`; body uses `brand.fonts.body`
- If a section asks for a phone-collecting form, it MUST include `<SmsConsent />` (build-blocking — see `scripts/enforce-a2p.mjs`)
- Hero text overlays must have `text-shadow` for legibility over video

## Niche-specific guidance

Apply the rules from `reasoning/{{niche}}.md` (composed into your system prompt). The `Key effect` section there describes the one visual move that signals "this niche done right" — execute it.

## Output format

Return a complete `src/app/page.tsx` file. Use Server Components (no `"use client"` unless a section truly requires it). Import shared components from `@/components/*`. Import brand config via `import brand from "@/../brand-config.json"`.

End with a JSON-LD block including FAQPage + (if relevant) Menu/Service per the niche taxonomy.

Output the file as a single fenced ```tsx code block. Nothing before or after.

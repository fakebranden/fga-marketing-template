# Prompts

> **Architecture note (Phase 5e, SOTY model).** The site layout is now a FIXED,
> hand-crafted SOTY composition (`src/app/page.tsx` server shell +
> `src/components/showcase/SotyHome.tsx`). The driver `scripts/generate-pages.mjs`
> **no longer generates page TSX from scratch.** It runs ONE Claude call against
> `home.md` to produce a strict JSON **content** object and merges it into
> `brand-config.json`; the fixed composition renders it. The driver writes
> `brand-config.json` only — it never touches `src/app/**.tsx`.
>
> Therefore `about.md`, `book.md`, `terms.md`, `privacy.md` are **dormant** —
> those pages ship as template defaults (already brand-config-driven). `/terms`
> and `/privacy` carry carrier-locked SMS prose and must NEVER be regenerated
> (see AGENTS.md). Keep the dormant prompts for reference / a future per-page
> pass, but only `home.md` is live.

## `home.md` — the live content contract

`home.md` tells Claude to return ONE JSON object filling the SOTY composition:

```
tagline · subtitle · description · faqs[] ·
content { marquee[] · pinned_statement{text,accent_word} · value_props[] ·
          process_steps[] · cta{kicker,title,subtitle,button} }
```

The driver's `sanitize()` validates + clamps every field; an invalid field falls
back to the existing `brand-config.json` value, so a garbled response degrades to
the template default instead of breaking the render. Testimonials are NEVER
generated — they come from the hub site record only.

## How it's composed at generate-time

The driver builds Claude's system prompt as:

```
{fga-pro-max niche grammar — reasoning/<niche>.md, if the skill dir is present}
{home.md}
```

…and the user message is the business facts (company, niche, service areas,
contact, hub notes) as the ONLY source of truth. Claude returns the JSON object.

## Local testing (no API key)

```
GENERATE_FIXTURE=/path/to/response.json node scripts/generate-pages.mjs site.json
```

`GENERATE_FIXTURE` short-circuits the API call and reads a canned JSON response —
use it to exercise the merge/validation path and CI smoke without spending tokens.

## Niche-specific extra pages (future)

`menu` (mobile-food-truck, restaurant-bar), `services` (plumber-hvac,
med-spa-aesthetic, auto-detail-mobile, barber-salon), `gallery` (before/after
niches). Not wired yet — they would extend either the SOTY content schema or add
dedicated route pages.

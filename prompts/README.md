# Per-page Prompts

Each `.md` in this directory is a **page-level generation contract** for the Claude Agent SDK driver (`scripts/generate-pages.mjs`).

## Contract

Every prompt file:
- Starts with `# Per-page contract: <PAGE> (<route>)`
- Lists required sections (always-render, even if minimal)
- Lists hard constraints (build-blocking — AEO/A2P-critical)
- Tells Claude what output format to emit (always: a single fenced ```tsx code block)

## How they're composed at generate-time

The driver composes Claude's system prompt as:

```
{fga-pro-max skill block: tokens + reasoning + recipe + AEO + A2P}
{this page's prompt template}
```

…and the user message is:

```
brand-config.json content:
{the resolved brand-config.json for this client}

GENERATE THE PAGE.
```

Claude returns one TSX file. The driver writes it to `src/app/<route>/page.tsx`.

## Variable interpolation

Tokens like `{{business_name}}` and `{{niche}}` are pre-substituted by the driver before the prompt goes to Claude — Claude sees concrete values.

## Niche-conditional generation

The driver consults `reasoning/_taxonomy.json` for the niche subtype. Some pages are only generated for some niches:

- `home.md` — always
- `about.md` — always
- `terms.md` — always
- `privacy.md` — always
- `book.md` — when `brand.has_booking !== false` (default ON for most niches; opt-out via brand kit)
- `menu.md` — when niche ∈ `{ mobile-food-truck, restaurant-bar }` (future)
- `services.md` — when niche ∈ `{ plumber-hvac, med-spa-aesthetic, auto-detail-mobile, barber-salon }` (future)
- `gallery.md` — when `brand.has_gallery === true` (future, for niches w/ before/after — med-spa, auto-detail)

## Adding a new prompt

1. Write the `.md` file with the contract template above
2. Add it to the `PROMPTS` registry in `scripts/generate-pages.mjs`
3. Add it to this README's niche-conditional table

## Token budget

Each prompt should stay under ~1,500 tokens. The driver pre-trims if any exceeds.

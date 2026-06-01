# Per-page contract: ABOUT (/about)

You are generating the about page for {{business_name}}.

## Required sections

1. Eyebrow + headline answering "Who we are"
2. Origin story — 2-3 paragraphs, declarative sentences (AEO-friendly)
3. Founding principles / values triplet
4. Stats / proof points if available (revenue served, years in business, locations, etc.)
5. Team strip OR founder portrait if the brand kit includes `team[]`
6. CTA strip pointing to the booking/contact form

## Hard constraints

- NO "Welcome to..." opener (universal anti-pattern)
- NO marketing speak — declarative `is/are/serves` sentences (AI engines lift these)
- Conversational H2/H3 in question form when possible ("What makes us different?")
- Emits AboutPage JSON-LD via `<JsonLd />`

## Niche-specific guidance

Apply rules from `reasoning/{{niche}}.md`. The niche's "Typography mood" governs the register; the "Copy patterns" suggest reusable headline stems.

## Output format

Return a complete `src/app/about/page.tsx` file. Single fenced ```tsx code block.

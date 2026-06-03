# SOTY Substrate Port — fga-marketing-template

Goal: every generated client site inherits the same award-tier interactive system proven on
`/showcase` (gisele.flyinggoatagency.com/showcase). Built on branch `soty-substrate`; merge to
`main` only after a clean `npm run build` + a test generation, since the Generate-Site pipeline
clones this template's default branch.

Reference implementation (source of truth, already shipped + QA'd):
`fga-ai-demo/src/app/showcase/` — `_components/{editorial,kinetic,cinematic,gsap-fx,WebGLHero,WebGLObject,LenisProvider}.tsx`
+ `src/components/ui/{container-scroll-animation,motion-footer,floating-icons-hero-section}.tsx` + `showcase.css`.

## Phase 1 — DONE (this branch)
- Added deps: framer-motion, gsap, @gsap/react, lenis, three, @react-three/fiber, @react-three/drei,
  @paper-design/shaders-react, clsx, tailwind-merge, lucide-react, split-type, @types/three.
- Added `src/lib/utils.ts` (`cn`).

## Phase 2 — substrate components (brand-agnostic, token-driven)
Copy into `src/components/showcase/`, swapping every FGA-hardcoded value for `brand-config.json` / props:
| Source | Port as | Parameterize |
|---|---|---|
| LenisProvider.tsx | same | none (brand-agnostic) |
| kinetic.tsx | same | none |
| container-scroll-animation.tsx | same | none |
| WebGLObject.tsx | same | accept `accent` prop (default `var(--volt)`) for wireframe/rim color |
| WebGLHero.tsx | same | `title`, `accentWord`, `subtitle`, kicker, CTAs from brand-config |
| editorial.tsx (Nav, MagneticButton, Reveal, RevealText, CustomCursor, Parallax, Wrap, scrollToAnchor) | same | Nav logo → `brand.logo_*`, links from `nav.ts`, CTA → booking |
| gsap-fx.tsx (IntroReveal, PinnedStatement) | same | IntroReveal mark → `brand.logo_path`; statement text from prompt |
| cinematic.tsx (ContainerScrollHero, HorizontalWork, ZoomParallaxMedia, StackingValue) | same | all data via props (already prop-driven) |
| motion-footer.tsx (CinematicFooter) | same | giant text → `brand.company`; pills → booking + nav; links → `brand.socials`; marquee → brand value props |
| floating-icons-hero-section.tsx | same | icons via prop |

## Phase 3 — token mapping (globals.css)
Map the showcase token system onto the template's existing brand tokens so one brand-config drives both:
`--volt → brand accent (colors.accent)`, `--ink → colors.ink`, `--paper → colors.surface`,
`--paper-2 → #fff/surface-soft`, `--line → derived`. Add the `.t-display/.t-h2/.t-h3/.t-body/.t-lead/.t-mono/.btn*/.sc-*/.cur*` classes (from showcase.css) into globals.css, var-driven. Light theme default; `data-theme="dark"` optional per brand.
Fonts: brand display + body via `next/font` from `brand.fonts` (fallback Anton + General Sans).

## Phase 4 — page composition + prompts
- Rewrite `src/app/page.tsx` to the SOTY composition (WebGL/hero-video hero → marquee → in-motion →
  work → value → method → pricing → testimonials → CTA → CinematicFooter), all reading brand-config.
  Keep A2P: booking form page stays separate; no ChatWidget on phone-collecting pages.
- Update `prompts/home.md` (+ menu/about) so the Claude Agent SDK fills the SOTY composition with the
  brand's content + niche grammar, instead of generating layout from scratch. Hero media: Higgsfield
  hero per niche (image/video) OR the WebGL object when no media.
- Keep build-blocking `enforce-a2p.mjs`; SEO/AEO baseline intact.

## Phase 5 — pipeline wiring (n8n, PRODUCTION — confirm before deploy)
`WF-MARKETING-SITE-GEN` already targets this template. No node change needed for the substrate
(it's in the template). Only update prompts/agent driver. Verify one test generation end-to-end,
then merge `soty-substrate` → `main`.

## Per-niche (fga-pro-max skill)
`fga-pro-max-skill/tokens/seeds` + `reasoning` + `recipes/sections.json` choose palette/sections/
motion-intensity per niche (9 niches). The template consumes the resolved tokens via brand-config.

"use client";

// SOTY-tier WebGL hero — a real R3F distorted/wireframe object (FGA yellow) that
// reacts to pointer + scroll, alongside bold art-directed type. Paper-Tiger model.
// Canvas is dynamically loaded (ssr:false) since WebGL is client-only.
//
// LEGIBILITY CONTRACT (enforced by scripts/check-text-legibility.mjs):
// the headline is generated per client and can be any length, so the hero must not
// assume the type happens to be short. Three rules keep it honest:
//   1. Type and media get DISJOINT zones — side by side on desktop, stacked on
//      mobile — and the type column is width-capped, so type can never grow into
//      the media zone however long the generated tagline is.
//   2. Display size is picked from the tagline's LENGTH, not just the viewport, so
//      a long headline steps down instead of wrapping into a wall.
//   3. The type sits in normal flow under `justify-end`, so an unexpectedly tall
//      block grows the hero instead of overflowing off the top of it.
// The wash is the belt-and-braces for the stacked (mobile) case.

import { Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { MagneticButton } from "./editorial";
import brand from "../../../brand-config.json";

const Canvas = dynamic(() => import("@react-three/fiber").then((m) => m.Canvas), { ssr: false });

// Feathers the object at every edge, so confining it to a zone reads as art
// direction rather than as a clipped rectangle. Direction-agnostic, so the same
// mask serves the mobile band and the desktop column.
const MEDIA_FEATHER = "radial-gradient(closest-side at 50% 50%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 100%)";

// Opaque under the type, fading out above it. Stops resolve against the TEXT
// BLOCK's own height (the element this sits in), not the hero's, so the covered
// area grows with the headline instead of spilling out of a magic percentage.
// Built from --paper, so a dark reference palette gets a dark wash for free.
// The element is inset 24% above the block, so the block's own top edge sits at
// ~80% of this gradient. Everything up to there must be FULLY opaque and the
// feather must live entirely in the overhang: at 72% the topmost line (the
// kicker) landed in the fade and measured 1:1 over the object once a long
// generated headline made the block taller.
const TYPE_WASH =
  "linear-gradient(to top, var(--paper) 0%, var(--paper) 80%," +
  " color-mix(in srgb, var(--paper) 55%, transparent) 92%, transparent 100%)";

// Display size as a function of headline length. The tagline is written by the
// content generator and routinely lands anywhere from 3 words to 12, so a single
// clamp() cannot serve both: what reads as a statement at 20 characters becomes a
// six-line wall at 60. Steps are deliberately coarse — each one is a real
// typographic size, not an interpolation — and every ceiling stays at or under
// the 6rem hero display cap.
export function headlineScale(tagline: string): string {
  const n = tagline.trim().length;
  if (n <= 24) return "clamp(2.6rem, 6vw, 5.75rem)";
  if (n <= 40) return "clamp(2.4rem, 5vw, 4.75rem)";
  if (n <= 62) return "clamp(2.1rem, 4.2vw, 3.9rem)";
  return "clamp(1.85rem, 3.4vw, 3.1rem)";
}

// the 3D object scene, code-split so three/drei never hit the server bundle
const Scene = dynamic(() => import("./WebGLObject").then((m) => m.WebGLObject), { ssr: false, loading: () => null });

export function WebGLHero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100dvh] w-full flex-col justify-end overflow-hidden pb-[clamp(2.5rem,6vh,4.5rem)] pt-44"
      style={{ background: "var(--paper)" }}
    >
      {/* MEDIA ZONE — a band below the kicker on mobile, the right column on
          desktop. Never the same real estate as the type. */}
      <div
        className="absolute inset-x-0 top-[14%] z-0 h-[38%] md:inset-y-0 md:top-0 md:left-[60%] md:h-auto"
        style={{ maskImage: MEDIA_FEATHER, WebkitMaskImage: MEDIA_FEATHER }}
      >
        {!reduce && (
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        )}
      </div>
      {/* top fade keeps the nav legible over the object */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40" style={{ background: "linear-gradient(180deg, var(--paper) 40%, transparent)" }} />

      {/* TYPE ZONE — in normal flow at the end of the column, held to the left
          side on desktop so it never enters the media zone. The kicker rides with
          the type rather than floating at the top of the hero, which keeps the
          left column reading as one block instead of two stranded fragments. */}
      <motion.div style={reduce ? undefined : { y: textY, opacity: fade }} className="relative z-10">
        {/* Stacked (mobile) case only: on desktop the column split already
            guarantees separation, so no wash is needed over the object. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-2rem] top-[-24%] -z-10 md:hidden" style={{ background: TYPE_WASH }} />
        <div className="wrap">
          <p className="t-mono mb-6" style={{ color: "var(--ink-soft)" }}>{brand.company}{brand.service_areas?.[0] ? ` · ${brand.service_areas[0]}` : ""}</p>
          <h1 className="t-display md:max-w-[56%]" style={{ fontSize: headlineScale(brand.tagline), lineHeight: 0.92 }}>
            {brand.tagline}
          </h1>
          {/* Lead keeps a readable measure and the CTAs sit under it, rather than
              beside it: sharing one narrow column squeezed the paragraph into a
              ten-line ribbon on long generated subtitles. */}
          <div className="mt-7 md:max-w-[56%]">
            <p className="t-lead" style={{ color: "var(--ink-soft)" }}>{brand.subtitle}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <MagneticButton href="#work" className="btn btn-primary">Get started</MagneticButton>
              <MagneticButton href="#book" className="btn btn-ghost">Book now</MagneticButton>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

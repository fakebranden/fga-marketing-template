"use client";

// SOTY-tier WebGL hero — a real R3F distorted/wireframe object (FGA yellow) that
// reacts to pointer + scroll, behind bold art-directed type. Paper-Tiger model.
// Canvas is dynamically loaded (ssr:false) since WebGL is client-only.

import { Suspense, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { MagneticButton } from "./editorial";

const Canvas = dynamic(() => import("@react-three/fiber").then((m) => m.Canvas), { ssr: false });

// the 3D object scene, code-split so three/drei never hit the server bundle
const Scene = dynamic(() => import("./WebGLObject").then((m) => m.WebGLObject), { ssr: false, loading: () => null });

export function WebGLHero() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-[100dvh] w-full overflow-hidden" style={{ background: "var(--paper)" }}>
      {/* WebGL object */}
      <div className="absolute inset-0 z-0">
        {!reduce && (
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        )}
        {/* keep type legible: object lives up top, headline sits on solid light below */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(0deg, var(--paper) 0%, rgba(243,242,236,0.6) 26%, transparent 52%)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(180deg, var(--paper), transparent)" }} />
      </div>

      {/* top kicker */}
      <div className="absolute inset-x-0 top-0 z-10 pt-28">
        <div className="wrap"><p className="t-mono" style={{ color: "var(--ink-soft)" }}>Flying Goat Agency &middot; Tampa, FL</p></div>
      </div>

      {/* bottom-anchored headline + CTAs */}
      <motion.div style={reduce ? undefined : { y: textY, opacity: fade }} className="absolute inset-x-0 bottom-0 z-10 pb-[clamp(2.5rem,6vh,4.5rem)]">
        <div className="wrap">
          <h1 className="t-display" style={{ fontSize: "clamp(2.6rem, 8vw, 7rem)", lineHeight: 0.9 }}>
            Websites your <em className="t-accent">business</em> runs on.
          </h1>
          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="t-lead" style={{ color: "var(--ink-soft)" }}>Brand-locked sites for local businesses, wired to your CRM and built to turn visitors into booked jobs.</p>
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <MagneticButton href="#work" className="btn btn-primary">See the work</MagneticButton>
              <MagneticButton href="#pricing" className="btn btn-ghost">Plans &amp; pricing</MagneticButton>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

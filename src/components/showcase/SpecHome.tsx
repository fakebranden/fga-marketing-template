"use client";

// Renders a LanderSpec as the home page.
//
// This is the spec-driven sibling of SotyHome. It supplies the two things the
// portable registry components deliberately do NOT own: the R3F hero object
// (WebGL, template-only) and the A2P booking form (server-rendered in page.tsx so
// the build-blocking consent check can see the tel input and <SmsConsent /> in one
// file). Everything else comes from the spec.
//
// The page chrome — smooth scroll, grain, intro reveal, cursor, nav, footer —
// stays here rather than in the registry, because it is site furniture rather
// than page content and the hub preview supplies its own.

import { LenisProvider } from "./LenisProvider";
import { Nav, CustomCursor } from "./editorial";
import { IntroReveal } from "./gsap-fx";
import { WebGLHeroObject } from "./WebGLHero";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { LanderRenderer } from "@/lander/registry";
import type { LanderSpec } from "@/lander/schema";

export function SpecHome({ spec, booking }: { spec: LanderSpec; booking: React.ReactNode }) {
  return (
    <LenisProvider>
      <main id="top" className="relative">
        <div className="sc-grain" aria-hidden />
        <IntroReveal />
        <CustomCursor />
        <Nav />
        <LanderRenderer
          spec={spec}
          slots={{ heroObject: <WebGLHeroObject />, bookingForm: booking }}
        />
        <CinematicFooter />
      </main>
    </LenisProvider>
  );
}

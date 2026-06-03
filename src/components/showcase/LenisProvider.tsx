"use client";

// Lenis smooth-scroll mount — hardened.
//   If Lenis fails to load (rare), the route just gets native scroll —
//   not a crash.

import { useEffect } from "react";

export function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const { default: Lenis } = await import("lenis");
        if (cancelled) return;

        const lenis = new Lenis({
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 1.5,
        });

        let rafId = 0;
        function raf(time: number) {
          lenis.raf(time);
          rafId = requestAnimationFrame(raf);
        }
        rafId = requestAnimationFrame(raf);

        (window as unknown as { __lenis?: typeof lenis }).__lenis = lenis;

        cleanup = () => {
          cancelAnimationFrame(rafId);
          lenis.destroy();
          delete (window as unknown as { __lenis?: typeof lenis }).__lenis;
        };
      } catch (err) {
        console.warn("[LenisProvider] smooth scroll disabled:", err);
      }
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}

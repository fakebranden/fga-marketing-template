"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Scroll-reveal wrapper — CSS-only fade-up animation triggered by
 * IntersectionObserver when the element enters the viewport. No
 * framer-motion dependency; keeps the bundle tiny.
 *
 * `as` — element type (defaults to div); pass `Fragment` if you don't
 * want an extra wrapper but lose the animation entry.
 * `delay` — ms delay before the reveal triggers (for stagger effects).
 * `from` — 'up' (default, fade + translate-y), 'left', 'right', 'fade-only'.
 *
 * Honors prefers-reduced-motion — falls back to instant visible.
 */
type Direction = "up" | "left" | "right" | "fade-only";

const TRANSFORMS: Record<Direction, string> = {
  up: "translate3d(0, 24px, 0)",
  left: "translate3d(-24px, 0, 0)",
  right: "translate3d(24px, 0, 0)",
  "fade-only": "translate3d(0, 0, 0)",
};

export function Reveal({
  children,
  delay = 0,
  from = "up",
  className = "",
  threshold = 0.15,
}: {
  children: React.ReactNode;
  delay?: number;
  from?: Direction;
  className?: string;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Respect reduced motion — show instantly.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      setShown(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            // Slight delay for stagger effects.
            const t = window.setTimeout(() => setShown(true), delay);
            obs.disconnect();
            return () => window.clearTimeout(t);
          }
        }
      },
      { threshold, rootMargin: "0px 0px -10% 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translate3d(0, 0, 0)" : TRANSFORMS[from],
        transition:
          "opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 700ms cubic-bezier(0.16, 1, 0.3, 1)",
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

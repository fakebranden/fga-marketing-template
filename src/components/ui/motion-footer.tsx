"use client";

// 21st.dev "motion-footer" CinematicFooter — curtain-reveal footer with giant
// background wordmark, value-prop marquee, magnetic glass pills, aurora + grid.
// Adapted for FGA: our fonts (no Google @import), FGA copy, Book-a-call → GHL
// booking popup, FGA links, no "Crafted by Volvox" badge.

import * as React from "react";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import brand from "../../../brand-config.json";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

// Scroll to the on-page A2P booking form (#book) via Lenis when available.
function openBooking() {
  if (typeof window === "undefined") return;
  const el = document.querySelector("#book");
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element, o?: object) => void } }).__lenis;
  if (lenis) lenis.scrollTo(el as Element, { offset: 0, duration: 1.4 });
  else (el as HTMLElement).scrollIntoView({ behavior: "smooth" });
}

const STYLES = `
.cinematic-footer-wrapper {
  font-family: var(--font-body), sans-serif;
  -webkit-font-smoothing: antialiased;
  --pill-bg-1: color-mix(in oklch, var(--foreground) 4%, transparent);
  --pill-bg-2: color-mix(in oklch, var(--foreground) 1%, transparent);
  --pill-shadow: color-mix(in oklch, var(--foreground) 14%, transparent);
  --pill-highlight: color-mix(in oklch, var(--background) 60%, transparent);
  --pill-inset-shadow: color-mix(in oklch, var(--foreground) 6%, transparent);
  --pill-border: color-mix(in oklch, var(--foreground) 12%, transparent);
  --pill-bg-1-hover: color-mix(in oklch, var(--foreground) 9%, transparent);
  --pill-bg-2-hover: color-mix(in oklch, var(--foreground) 3%, transparent);
  --pill-border-hover: color-mix(in oklch, var(--foreground) 26%, transparent);
  --pill-shadow-hover: color-mix(in oklch, var(--foreground) 22%, transparent);
  --pill-highlight-hover: color-mix(in oklch, var(--background) 80%, transparent);
}
@keyframes footer-breathe { 0%{transform:translate(-50%,-50%) scale(1);opacity:.55} 100%{transform:translate(-50%,-50%) scale(1.1);opacity:.95} }
@keyframes footer-scroll-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.animate-footer-breathe { animation: footer-breathe 8s ease-in-out infinite alternate; }
.animate-footer-scroll-marquee { animation: footer-scroll-marquee 40s linear infinite; }
.footer-bg-grid {
  background-size: 60px 60px;
  background-image: linear-gradient(to right, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 4%, transparent) 1px, transparent 1px);
  mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 30%, black 70%, transparent);
}
.footer-aurora { background: radial-gradient(circle at 50% 50%, color-mix(in oklch, var(--primary) 22%, transparent) 0%, color-mix(in oklch, var(--primary) 8%, transparent) 40%, transparent 70%); }
.footer-glass-pill {
  background: linear-gradient(145deg, var(--pill-bg-1) 0%, var(--pill-bg-2) 100%);
  box-shadow: 0 10px 30px -10px var(--pill-shadow), inset 0 1px 1px var(--pill-highlight), inset 0 -1px 2px var(--pill-inset-shadow);
  border: 1px solid var(--pill-border);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.footer-glass-pill:hover { background: linear-gradient(145deg, var(--pill-bg-1-hover) 0%, var(--pill-bg-2-hover) 100%); border-color: var(--pill-border-hover); box-shadow: 0 20px 40px -10px var(--pill-shadow-hover), inset 0 1px 1px var(--pill-highlight-hover); color: var(--foreground); }
.footer-giant-bg-text {
  font-family: var(--font-display), sans-serif;
  font-size: 24vw; line-height: 0.75; font-weight: 700; letter-spacing: -0.03em; text-transform: uppercase;
  color: transparent; -webkit-text-stroke: 1px color-mix(in oklch, var(--foreground) 7%, transparent);
  background: linear-gradient(180deg, color-mix(in oklch, var(--foreground) 9%, transparent) 0%, transparent 60%);
  -webkit-background-clip: text; background-clip: text;
}
.footer-text-glow {
  font-family: var(--font-display), sans-serif;
  color: var(--foreground);
}
@media (prefers-reduced-motion: reduce) { .animate-footer-breathe, .animate-footer-scroll-marquee { animation: none; } }
`;

type MagProps = React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement> & { as?: React.ElementType };
const MagneticButton = React.forwardRef<HTMLElement, MagProps>(({ className, children, as: Component = "button", ...props }, forwardedRef) => {
  const localRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = localRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const ctx = gsap.context(() => {
      const move = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        gsap.to(el, { x: x * 0.4, y: y * 0.4, scale: 1.05, ease: "power2.out", duration: 0.4 });
      };
      const leave = () => gsap.to(el, { x: 0, y: 0, scale: 1, ease: "elastic.out(1, 0.3)", duration: 1.2 });
      el.addEventListener("mousemove", move as EventListener);
      el.addEventListener("mouseleave", leave);
      return () => { el.removeEventListener("mousemove", move as EventListener); el.removeEventListener("mouseleave", leave); };
    }, el);
    return () => ctx.revert();
  }, []);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const C = Component as any;
  return (
    <C
      ref={(node: HTMLElement) => { (localRef as React.MutableRefObject<HTMLElement | null>).current = node; if (typeof forwardedRef === "function") forwardedRef(node); else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLElement | null>).current = node; }}
      className={cn("cursor-pointer", className)} {...props}
    >
      {children}
    </C>
  );
});
MagneticButton.displayName = "FooterMagneticButton";

const MarqueeItem = () => (
  <div className="flex items-center space-x-10 px-6 font-[family-name:var(--font-mono)] uppercase">
    <span>Premium design</span> <span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>✦</span>
    <span>Mobile-first</span> <span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>✦</span>
    <span>Book online</span> <span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>✦</span>
    <span>Built to convert</span> <span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>✦</span>
    <span>Found on Google</span> <span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>✦</span>
  </div>
);

export function CinematicFooter() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const giantTextRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !wrapperRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(giantTextRef.current, { y: "10vh", scale: 0.85, opacity: 0 }, { y: "0vh", scale: 1, opacity: 1, ease: "power1.out", scrollTrigger: { trigger: wrapperRef.current, start: "top 80%", end: "bottom bottom", scrub: 1 } });
      gsap.fromTo([headingRef.current, linksRef.current], { y: 50, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.15, ease: "power3.out", scrollTrigger: { trigger: wrapperRef.current, start: "top 45%", end: "bottom bottom", scrub: 1 } });
    }, wrapperRef);
    return () => ctx.revert();
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div ref={wrapperRef} className="relative h-screen w-full" style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}>
        <footer className="cinematic-footer-wrapper fixed bottom-0 left-0 flex h-screen w-full flex-col justify-between overflow-hidden" style={{ background: "var(--background)", color: "var(--foreground)" }}>
          <div className="footer-aurora pointer-events-none absolute left-1/2 top-1/2 z-0 h-[60vh] w-[80vw] -translate-x-1/2 -translate-y-1/2 animate-footer-breathe rounded-[50%] blur-[80px]" />
          <div className="footer-bg-grid pointer-events-none absolute inset-0 z-0" />
          <div ref={giantTextRef} className="footer-giant-bg-text pointer-events-none absolute -bottom-[4vh] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap">{brand.company}</div>

          {/* marquee */}
          <div className="absolute left-0 top-12 z-10 w-full -rotate-2 scale-110 overflow-hidden border-y py-4 shadow-2xl" style={{ borderColor: "var(--line)", background: "color-mix(in oklch, var(--background) 60%, transparent)", backdropFilter: "blur(8px)" }}>
            <div className="flex w-max animate-footer-scroll-marquee text-xs font-bold tracking-[0.3em] md:text-sm" style={{ color: "var(--ink-faint)" }}>
              <MarqueeItem /><MarqueeItem />
            </div>
          </div>

          {/* center content */}
          <div className="relative z-10 mx-auto mt-20 flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6">
            <h2 ref={headingRef} className="footer-text-glow mb-12 text-center uppercase" style={{ fontSize: "clamp(2.4rem,6vw,6rem)", lineHeight: 0.92, letterSpacing: "-0.01em" }}>Let&rsquo;s build yours.</h2>
            <div ref={linksRef} className="flex w-full flex-col items-center gap-6">
              <div className="flex w-full flex-wrap justify-center gap-4">
                <MagneticButton as="button" onClick={openBooking} className="footer-glass-pill group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold md:text-base" style={{ background: "var(--volt)", color: "#141204", borderColor: "transparent" }}>
                  <CalendarDays className="h-5 w-5" /> Book a call
                </MagneticButton>
                <MagneticButton as="a" href="#value" className="footer-glass-pill group flex items-center gap-3 rounded-full px-10 py-5 text-sm font-bold md:text-base" style={{ color: "var(--foreground)" }}>
                  What you get <ArrowUpRight className="h-5 w-5" />
                </MagneticButton>
              </div>
              <div className="mt-2 flex w-full flex-wrap justify-center gap-3 md:gap-5">
                {([["Instagram", brand.socials?.instagram || brand.canonical_url], ["Facebook", brand.socials?.facebook || brand.canonical_url], ["Website", brand.canonical_url]] as [string, string][]).filter(([, h]) => h).map(([l, h]) => (
                  <MagneticButton key={l} as="a" href={h} target="_blank" rel="noopener noreferrer" className="footer-glass-pill rounded-full px-6 py-3 text-xs font-medium md:text-sm" style={{ color: "var(--ink-soft)" }}>{l}</MagneticButton>
                ))}
              </div>
            </div>
          </div>

          {/* bottom bar */}
          <div className="relative z-20 flex w-full flex-col items-center justify-between gap-4 px-6 pb-8 md:flex-row md:px-12">
            <div className="font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-widest md:text-xs" style={{ color: "var(--ink-faint)" }}>{`© 2026 ${brand.company}`}</div>
            <div className="font-[family-name:var(--font-mono)] text-[10px] font-semibold uppercase tracking-widest md:text-xs" style={{ color: "var(--ink-faint)" }}>{brand.tagline}</div>
            <MagneticButton as="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="footer-glass-pill group flex h-12 w-12 items-center justify-center rounded-full" style={{ color: "var(--ink-soft)" }} aria-label="Back to top">
              <svg className="h-5 w-5 transform transition-transform duration-300 group-hover:-translate-y-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
            </MagneticButton>
          </div>
        </footer>
      </div>
    </>
  );
}

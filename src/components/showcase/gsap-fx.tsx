"use client";

// GSAP scroll choreography (per the awwwards-animations skill):
//  - IntroReveal: page-load FGA-mark loader that wipes up to reveal the hero
//  - PinnedStatement: a pinned, scroll-scrubbed kinetic statement (ScrollTrigger,
//    synced to Lenis)
// ScrollTrigger is synced to Lenis via window.__lenis (set by LenisProvider).

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function IntroReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useGSAP(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || sessionStorage.getItem("fga_intro")) { setDone(true); return; }
    const tl = gsap.timeline({ onComplete: () => { sessionStorage.setItem("fga_intro", "1"); setDone(true); } });
    tl.fromTo(".intro-mark", { scale: 0.7, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "power3.out" })
      .to(".intro-bar-fill", { scaleX: 1, duration: 0.95, ease: "power2.inOut" }, "-=0.3")
      .to(".intro-mark", { opacity: 0, scale: 1.05, duration: 0.4 }, "+=0.05")
      .to(ref.current, { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, "-=0.05");
  }, { scope: ref });
  if (done) return null;
  return (
    <div ref={ref} className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: "#08080a" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/showcase/brand/fga-mark.png" alt="Flying Goat Agency" className="intro-mark w-24 md:w-32" />
      <div className="intro-bar mt-8 h-px w-40 overflow-hidden" style={{ background: "rgba(244,242,236,0.16)" }}>
        <div className="intro-bar-fill h-full w-full origin-left" style={{ background: "var(--volt)", transform: "scaleX(0)" }} />
      </div>
    </div>
  );
}

/** Pinned, scrubbed kinetic statement. Pass the line as words via `text`. */
export function PinnedStatement({ text, accentWord }: { text: string; accentWord?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const words = text.split(" ");
  useGSAP(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // sync ScrollTrigger to Lenis smooth scroll
    const lenis = (window as unknown as { __lenis?: { on: (e: string, cb: () => void) => void } }).__lenis;
    if (lenis) lenis.on("scroll", ScrollTrigger.update);
    const wordEls = gsap.utils.toArray<HTMLElement>(".pin-word", ref.current);
    if (reduce) { gsap.set(wordEls, { opacity: 1 }); return; }
    gsap.set(wordEls, { opacity: 0.14 });
    gsap.to(wordEls, {
      opacity: 1, ease: "none", stagger: 0.4,
      scrollTrigger: { trigger: ref.current, start: "top top", end: "+=140%", pin: true, scrub: 1, anticipatePin: 1 },
    });
  }, { scope: ref });
  return (
    <section ref={ref} className="flex min-h-[100dvh] items-center" style={{ background: "var(--paper)" }}>
      <div className="wrap">
        <p className="font-[family-name:var(--font-display)] uppercase" style={{ fontSize: "clamp(2rem,6vw,5.5rem)", lineHeight: 0.98, letterSpacing: "0.005em", maxWidth: "18ch" }}>
          {words.map((w, i) => {
            const isAccent = accentWord && w.replace(/[.,]/g, "") === accentWord;
            return (
              <span key={i} className="pin-word inline-block" style={isAccent
                ? { marginRight: "0.25em", background: "var(--volt)", color: "#141204", padding: "0 0.1em", boxDecorationBreak: "clone", WebkitBoxDecorationBreak: "clone" }
                : { marginRight: "0.25em", color: "var(--ink)" }}>{w}</span>
            );
          })}
        </p>
      </div>
    </section>
  );
}

"use client";

// Editorial primitives for /showcase (OPTIMIND-match, light theme).
// Restrained uppercase nav, HUD section counter, scroll-reveal + magnetic CTA.
// Motion follows Emil (strong ease-out, scale(0.97) press, stagger, springs)
// and framer-motion patterns. prefers-reduced-motion honored.

import { useEffect, useRef, useState } from "react";
import {
  motion, useInView, useScroll, useSpring, useTransform,
  useMotionValue, useReducedMotion,
} from "framer-motion";
import brand from "../../../brand-config.json";

export const EASE = [0.23, 1, 0.32, 1] as const; // Emil strong ease-out

// smooth in-page scroll via Lenis (falls back to native)
export function scrollToAnchor(href: string) {
  if (typeof window === "undefined") return;
  const el = href === "#top" ? document.body : document.querySelector(href);
  if (!el) return;
  const lenis = (window as unknown as { __lenis?: { scrollTo: (t: Element | number, o?: object) => void } }).__lenis;
  if (lenis) lenis.scrollTo(href === "#top" ? 0 : (el as Element), { offset: 0, duration: 1.4 });
  else (el as HTMLElement).scrollIntoView({ behavior: "smooth" });
}

export function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`wrap ${className}`}>{children}</div>;
}

const NAV = [["Work", "#work"], ["What you get", "#value"], ["Method", "#method"], ["Plans", "#pricing"]];

export function Nav() {
  const [solid, setSolid] = useState(false);
  const { scrollY } = useScroll();
  useEffect(() => scrollY.on("change", (v) => setSolid(v > 20)), [scrollY]);
  return (
    <header
      className="fixed z-50 transition-all duration-500"
      style={{
        top: "calc(var(--gutter) + 0.55rem)",
        left: "calc(var(--gutter) + var(--margin) - 0.5rem)",
        right: "calc(var(--gutter) + var(--margin) - 0.5rem)",
        background: solid ? "rgba(243,242,236,0.78)" : "transparent",
        backdropFilter: solid ? "blur(12px)" : "none",
        borderRadius: 9999,
        border: `1px solid ${solid ? "var(--line)" : "transparent"}`,
        padding: solid ? "0.45rem 0.75rem 0.45rem 1.1rem" : "0.45rem 0.4rem",
      }}
    >
      <div className="flex items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-2.5" data-magnetic onClick={(e) => { e.preventDefault(); scrollToAnchor("#top"); }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--volt)" }} aria-hidden />
          <span className="font-[family-name:var(--font-display)] text-[0.95rem] uppercase tracking-[0.04em]" style={{ color: "var(--ink)" }}>{brand.company}</span>
        </a>
        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map(([l, h]) => (
            <a key={h} href={h} className="sc-link t-mono" onClick={(e) => { e.preventDefault(); scrollToAnchor(h); }}>{l}</a>
          ))}
        </nav>
        <MagneticButton href="#book" className="btn btn-primary">Book now</MagneticButton>
      </div>
    </header>
  );
}

/* live HUD section counter (OPTIMIND 002/005) */
export function SectionCounter({ labels }: { labels: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-sec]"));
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) setI(Number(e.target.getAttribute("data-sec"))); }),
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  const pad = (n: number) => String(n).padStart(3, "0");
  return (
    <div className="pointer-events-none fixed z-40 hidden md:flex flex-col gap-1" style={{ top: "calc(var(--gutter) + 4.5rem)", left: "calc(var(--gutter) + var(--margin))" }}>
      <span className="hud" style={{ color: "var(--ink)" }}>{pad(i + 1)} <span style={{ color: "var(--ink-faint)" }}>/ {pad(labels.length)}</span></span>
      <span className="hud">{labels[i]}</span>
    </div>
  );
}

export function MagneticButton({
  children, href, className = "", onClick,
}: { children: React.ReactNode; href?: string; className?: string; onClick?: () => void }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 160, damping: 14, mass: 0.12 });
  const sy = useSpring(y, { stiffness: 160, damping: 14, mass: 0.12 });
  const ext = href?.startsWith("http");
  const go = (e: React.MouseEvent) => {
    if (href && href.startsWith("#")) { e.preventDefault(); scrollToAnchor(href); }
    onClick?.();
  };
  return (
    <motion.a
      ref={ref} href={href} onClick={go}
      target={ext ? "_blank" : undefined} rel={ext ? "noopener noreferrer" : undefined}
      className={className} style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        if (reduce || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.a>
  );
}

/* word-by-word headline reveal (stagger, Emil scale(0.95)+opacity, never scale(0)) */
export function RevealText({
  children, className = "", as = "h2", delay = 0,
}: { children: string; className?: string; as?: "h1" | "h2" | "h3" | "p"; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduce = useReducedMotion();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Tag = as as any;
  if (reduce) return <Tag className={className}>{children}</Tag>;
  const words = children.split(" ");
  return (
    <Tag ref={ref} className={className} aria-label={children}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom" aria-hidden>
          <motion.span
            className="inline-block"
            initial={{ y: "108%", opacity: 0 }}
            animate={inView ? { y: "0%", opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: EASE, delay: delay + i * 0.045 }}
          >
            {w}{i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

export function Reveal({
  children, className = "", delay = 0, y = 24,
}: { children: React.ReactNode; className?: string; delay?: number; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/* premium custom cursor — instant dot + lagging ring, scales over interactives */
export function CustomCursor() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 300, damping: 28, mass: 0.5 });
  const ry = useSpring(y, { stiffness: 300, damping: 28, mass: 0.5 });
  const [hover, setHover] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); setShown(true); };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      setHover(!!t.closest("a,button,[role=button],[data-magnetic],summary,input,textarea"));
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    document.documentElement.classList.add("sc-cursor-on");
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      document.documentElement.classList.remove("sc-cursor-on");
    };
  }, [reduce, x, y]);
  if (reduce) return null;
  return (
    <>
      <motion.div className="sc-cur-dot hidden md:block" style={{ x, y, opacity: shown ? 1 : 0 }} />
      <motion.div
        className="sc-cur-ring hidden md:block"
        style={{ x: rx, y: ry, opacity: shown ? 1 : 0 }}
        animate={{ scale: hover ? 1.9 : 1, backgroundColor: hover ? "rgba(246,235,30,0.16)" : "rgba(246,235,30,0)" }}
        transition={{ type: "spring", stiffness: 220, damping: 20 }}
      />
    </>
  );
}

export function Parallax({
  children, depth = 0.1, className = "",
}: { children: React.ReactNode; depth?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const yv = useTransform(scrollYProgress, [0, 1], [`${depth * 100}%`, `${-depth * 100}%`]);
  return (
    <div ref={ref} className={className} style={{ overflow: "hidden" }}>
      <motion.div style={reduce ? undefined : { y: yv }}>{children}</motion.div>
    </div>
  );
}

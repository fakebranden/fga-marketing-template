"use client";

// Cinematic, media-driven sections built from real 21st.dev motion components,
// wired to the FGA client videos + media. Dark, scroll-driven, expressive.
//  - VideoHero        : full-bleed autoplay video + kinetic headline + yellow pop
//  - HorizontalWork   : 21st horizontal-scroll-carousel, client VIDEO cards
//  - ZoomParallaxMedia: 21st zoom-parallax, FGA media grid scaling on scroll
//  - StackingValue    : 21st stacking-card, value props with media

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion, type MotionValue } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { MagneticButton, EASE } from "./editorial";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import brand from "../../../brand-config.json";

/* ───────── VideoHero ───────── */
export function VideoHero() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const reveal = (delay: number) => reduce ? {} : { initial: { y: "115%" }, animate: { y: "0%" }, transition: { duration: 0.9, ease: EASE, delay } };
  return (
    <section ref={ref} className="relative h-[100dvh] w-full overflow-hidden">
      <motion.div style={reduce ? undefined : { y }} className="absolute inset-0 z-0">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video autoPlay muted loop playsInline preload="auto" className="h-full w-full object-cover"
          poster="/showcase/cinematic/hero-poster.jpg">
          <source src="/showcase/video/hero-cinematic.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0" style={{ background: "radial-gradient(60% 50% at 62% 38%, transparent 0%, rgba(8,8,10,0.35) 70%), linear-gradient(180deg, rgba(8,8,10,0.35) 0%, rgba(8,8,10,0.25) 38%, rgba(8,8,10,0.94) 100%)" }} />
      </motion.div>

      <motion.div style={reduce ? undefined : { opacity: fade }} className="relative z-10 flex h-full flex-col justify-end pb-[clamp(3rem,8vh,6rem)]">
        <div className="wrap">
          <div className="overflow-hidden"><motion.p className="t-mono mb-6" {...reveal(0.1)}>{brand.company}{brand.service_areas?.[0] ? ` · ${brand.service_areas[0]}` : ""}</motion.p></div>
          <h1 className="t-display max-w-[16ch]">
            <span className="block overflow-hidden"><motion.span className="block" {...reveal(0.18)}>Websites your</motion.span></span>
            <span className="block overflow-hidden"><motion.span className="block" {...reveal(0.26)}><em className="t-accent">business</em> runs on.</motion.span></span>
          </h1>
          <motion.p className="t-lead mt-7" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}>
            Brand-locked sites for local businesses, wired to your CRM and built to turn visitors into booked jobs.
          </motion.p>
          <motion.div className="mt-9 flex flex-wrap items-center gap-3" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}>
            <MagneticButton href="#work" className="btn btn-primary">See the work</MagneticButton>
            <MagneticButton href="#pricing" className="btn btn-ghost">Plans &amp; pricing</MagneticButton>
          </motion.div>
        </div>
      </motion.div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
        <span className="t-mono" style={{ color: "rgba(244,242,236,0.6)" }}>Scroll</span>
        <motion.span className="h-8 w-px" style={{ background: "linear-gradient(var(--volt), transparent)" }} animate={reduce ? {} : { scaleY: [0.3, 1, 0.3], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
      </div>
    </section>
  );
}

/* ───────── ContainerScrollHero (21st container-scroll-animation + Ad video) ───────── */
export function ContainerScrollHero() {
  return (
    <section className="relative pt-10">
      <ContainerScroll
        titleComponent={
          <div className="px-4">
            <p className="t-mono mb-6" style={{ color: "var(--volt)" }}>How it works</p>
            <h2 className="t-h2 mx-auto max-w-[16ch]">Your brand, in motion.</h2>
            <p className="t-lead mx-auto mt-6" style={{ color: "var(--ink-soft)" }}>Every build is art-directed, animated, and wired to convert. This is the standard your business gets.</p>
          </div>
        }
      >
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video autoPlay muted loop playsInline preload="auto" poster="/showcase/cinematic/hero-poster.jpg" className="h-full w-full object-cover">
          <source src="/showcase/video/ad-1.mp4" type="video/mp4" />
        </video>
      </ContainerScroll>
    </section>
  );
}

/* ───────── HorizontalWork (21st horizontal-scroll-carousel) ───────── */
export type WorkItem = { name: string; niche: string; url: string; video: string; poster: string; year: string };
export function HorizontalWork({ items }: { items: WorkItem[] }) {
  const targetRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: targetRef });
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-82%"]);
  if (reduce) {
    return (
      <section className="section">
        <div className="wrap grid grid-cols-1 gap-5 md:grid-cols-2">{items.map((c) => <WorkCard key={c.url} card={c} />)}</div>
      </section>
    );
  }
  return (
    <section ref={targetRef} className="relative h-[320vh]">
      <div className="sticky top-0 flex h-[100dvh] items-center overflow-hidden">
        <motion.div style={{ x }} className="flex gap-6 pl-[var(--margin)]">
          {items.map((c) => <WorkCard key={c.url} card={c} />)}
          <div className="flex h-[62vh] w-[34vw] min-w-[320px] flex-col justify-center pr-[var(--margin)]">
            <p className="t-h3" style={{ color: "var(--ink)" }}>Every build is live, brand-locked, and wired to capture leads.</p>
            <MagneticButton href="#pricing" className="btn btn-primary mt-7 w-fit">See the plans</MagneticButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
function WorkCard({ card }: { card: WorkItem }) {
  return (
    <a href={card.url} target="_blank" rel="noopener noreferrer"
      className="group relative h-[62vh] w-[78vw] shrink-0 overflow-hidden md:w-[44vw]" style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video autoPlay muted loop playsInline preload="metadata" poster={card.poster}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-105">
        <source src={card.video} type="video/mp4" />
      </video>
      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,8,10,0.88) 4%, rgba(8,8,10,0.1) 48%, transparent 78%)" }} />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-7">
        <div>
          <span className="t-mono mb-2 block" style={{ color: "var(--volt)" }}>{card.niche} &middot; {card.year}</span>
          <h3 className="font-[family-name:var(--font-display)] font-semibold" style={{ fontSize: "clamp(1.6rem,2.6vw,2.4rem)", letterSpacing: "-0.02em", color: "#fff" }}>{card.name}</h3>
        </div>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-[14deg]" style={{ background: "var(--volt)", color: "#141204" }}><ArrowUpRight className="h-5 w-5" strokeWidth={2} /></span>
      </div>
    </a>
  );
}

/* ───────── ZoomParallaxMedia (21st zoom-parallax) ───────── */
export function ZoomParallaxMedia({ images }: { images: { src: string; alt?: string }[] }) {
  const container = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });
  const s4 = useTransform(scrollYProgress, [0, 1], [1, 4]);
  const s5 = useTransform(scrollYProgress, [0, 1], [1, 5]);
  const s6 = useTransform(scrollYProgress, [0, 1], [1, 6]);
  const s8 = useTransform(scrollYProgress, [0, 1], [1, 8]);
  const s9 = useTransform(scrollYProgress, [0, 1], [1, 9]);
  const scales = [s4, s5, s6, s5, s6, s8, s9];
  if (reduce) {
    return <section className="section"><div className="wrap grid grid-cols-2 gap-3 md:grid-cols-3">{images.slice(0, 6).map((im, i) => <div key={i} className="aspect-video overflow-hidden"><img src={im.src} alt={im.alt || ""} className="h-full w-full object-cover" /></div>)}</div></section>;
  }
  return (
    <div ref={container} className="relative h-[300vh]">
      <div className="sticky top-0 h-[100dvh] overflow-hidden">
        {images.map(({ src, alt }, index) => (
          <motion.div key={index} style={{ scale: scales[index % scales.length] }}
            className={`absolute top-0 flex h-full w-full items-center justify-center ${index === 1 ? "[&>div]:!-top-[30vh] [&>div]:!left-[5vw] [&>div]:!h-[30vh] [&>div]:!w-[35vw]" : ""} ${index === 2 ? "[&>div]:!-top-[10vh] [&>div]:!-left-[25vw] [&>div]:!h-[45vh] [&>div]:!w-[20vw]" : ""} ${index === 3 ? "[&>div]:!left-[27.5vw] [&>div]:!h-[25vh] [&>div]:!w-[25vw]" : ""} ${index === 4 ? "[&>div]:!top-[27.5vh] [&>div]:!left-[5vw] [&>div]:!h-[25vh] [&>div]:!w-[20vw]" : ""} ${index === 5 ? "[&>div]:!top-[27.5vh] [&>div]:!-left-[22.5vw] [&>div]:!h-[25vh] [&>div]:!w-[30vw]" : ""} ${index === 6 ? "[&>div]:!top-[22.5vh] [&>div]:!left-[25vw] [&>div]:!h-[15vh] [&>div]:!w-[15vw]" : ""}`}>
            <div className="relative h-[25vh] w-[25vw] overflow-hidden">
              <img src={src} alt={alt || `FGA media ${index + 1}`} className="h-full w-full object-cover" />
            </div>
          </motion.div>
        ))}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="t-mono" style={{ color: "rgba(244,242,236,0.55)" }}>Real work, real brands</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── StackingValue (21st stacking-card) ───────── */
export type ValueCard = { title: string; description: string; image: string };
export function StackingValue({ cards }: { cards: ValueCard[] }) {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ["start start", "end end"] });
  return (
    <div ref={container} className="relative">
      {cards.map((c, i) => {
        const targetScale = 1 - (cards.length - i) * 0.04;
        return <StackCard key={i} i={i} card={c} progress={scrollYProgress} range={[i * (1 / cards.length), 1]} targetScale={targetScale} total={cards.length} />;
      })}
    </div>
  );
}
function StackCard({ i, card, progress, range, targetScale, total }: { i: number; card: ValueCard; progress: MotionValue<number>; range: [number, number]; targetScale: number; total: number }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start start"] });
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.5, 1]);
  const scale = useTransform(progress, range, [1, targetScale]);
  // Emil: dim + blur the outgoing (scaled-down) card so the stack reads layered, not muddy
  const dim = useTransform(scale, [targetScale, 1], [0.62, 0]);
  const blurPx = useTransform(scale, [targetScale, 1], [3.5, 0]);
  const blur = useTransform(blurPx, (v) => `blur(${v}px)`);
  return (
    <div ref={ref} className="sticky top-0 flex h-[100dvh] items-center justify-center">
      <motion.div
        style={reduce ? { top: 0 } : { scale, top: `calc(-6vh + ${i * 20}px)` }}
        className="relative flex h-[66vh] w-[88%] max-w-[68rem] origin-top flex-col justify-end overflow-hidden md:w-[80%]"
      >
        <div className="absolute inset-0" style={{ border: "1px solid var(--line)" }}>
          <motion.div style={reduce ? undefined : { scale: imageScale, filter: blur }} className="h-full w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={card.image} alt="" aria-hidden className="h-full w-full object-cover" />
          </motion.div>
          <div className="absolute inset-0" style={{ background: "linear-gradient(110deg, rgba(8,8,10,0.9) 0%, rgba(8,8,10,0.4) 55%, rgba(8,8,10,0.15) 100%)" }} />
          <motion.div className="absolute inset-0" style={reduce ? undefined : { opacity: dim, background: "#08080a" }} />
        </div>
        <div className="relative z-10 p-9 md:p-14">
          <span className="t-mono mb-4 block" style={{ color: "var(--volt)" }}>{String(i + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
          <h3 className="font-[family-name:var(--font-display)] font-semibold" style={{ fontSize: "clamp(1.8rem,3.4vw,3rem)", letterSpacing: "-0.025em", lineHeight: 1.02, color: "#fff", maxWidth: "16ch" }}>{card.title}</h3>
          <p className="t-body mt-4" style={{ color: "rgba(244,242,236,0.78)", maxWidth: "46ch" }}>{card.description}</p>
        </div>
      </motion.div>
    </div>
  );
}

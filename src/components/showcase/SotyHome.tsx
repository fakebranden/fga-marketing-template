"use client";

// SOTY marketing landing — the premium, brand-config-driven home experience.
// Composed from the ported showcase substrate (R3F hero, GSAP scroll
// choreography, 21st motion components) wired entirely to brand-config.json so
// one brand kit re-skins the whole system. The A2P booking form is server-
// rendered in page.tsx and passed in as the `booking` node (keeps the tel input
// + <SmsConsent /> co-located for the build-blocking A2P check).

import {
  Palette, Inbox, MessageSquare, Search, Rocket, Globe, BarChart3,
  CalendarDays, Zap, ShieldCheck, MousePointerClick, TrendingUp, Sparkles, PenTool,
} from "lucide-react";
import brand from "../../../brand-config.json";
import { LenisProvider } from "./LenisProvider";
import { Nav, Wrap, Reveal, CustomCursor, scrollToAnchor } from "./editorial";
import { CutHeading } from "./kinetic";
import { IntroReveal, PinnedStatement } from "./gsap-fx";
import { WebGLHero } from "./WebGLHero";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { FloatingIconsHero } from "@/components/ui/floating-icons-hero-section";

const CTA_ICONS = [
  { id: 1, icon: Palette, className: "top-[12%] left-[10%]" },
  { id: 2, icon: Inbox, className: "top-[20%] right-[9%]" },
  { id: 3, icon: MessageSquare, className: "top-[78%] left-[12%]" },
  { id: 4, icon: Search, className: "bottom-[12%] right-[12%]" },
  { id: 5, icon: Rocket, className: "top-[8%] left-[32%]" },
  { id: 6, icon: Globe, className: "top-[10%] right-[30%]" },
  { id: 7, icon: BarChart3, className: "bottom-[10%] left-[28%]" },
  { id: 8, icon: CalendarDays, className: "top-[42%] left-[7%]" },
  { id: 9, icon: Zap, className: "top-[72%] right-[26%]" },
  { id: 10, icon: ShieldCheck, className: "top-[50%] right-[6%]" },
  { id: 11, icon: MousePointerClick, className: "top-[86%] right-[44%]" },
  { id: 12, icon: TrendingUp, className: "top-[55%] left-[6%]" },
  { id: 13, icon: Sparkles, className: "top-[8%] left-[56%]" },
  { id: 14, icon: PenTool, className: "bottom-[8%] right-[46%]" },
];

type ValueProp = { title: string; description: string };
type ProcessStep = { step: string; title: string; description: string };
type Testimonial = { quote: string; author: string; location?: string };
type HomeContent = {
  marquee?: string[];
  pinned_statement?: { text: string; accent_word?: string };
  value_props?: ValueProp[];
  process_steps?: ProcessStep[];
  testimonials?: Testimonial[];
  cta?: { kicker?: string; title?: string; subtitle?: string; button?: string };
};

export function SotyHome({ booking }: { booking: React.ReactNode }) {
  // brand-config may omit `content` after a pipeline overwrite — fall back safely.
  const content = (brand.content ?? {}) as HomeContent;
  const marquee: string[] = content.marquee?.length ? content.marquee : (brand.service_areas ?? []);
  const pinned = content.pinned_statement;
  const valueProps: ValueProp[] = content.value_props ?? [];
  const steps: ProcessStep[] = content.process_steps ?? [];
  const testimonials: Testimonial[] = content.testimonials ?? [];
  const cta = content.cta;

  return (
    <LenisProvider>
      <main id="top" className="relative">
        <div className="sc-grain" aria-hidden />
        <IntroReveal />
        <CustomCursor />
        <Nav />

        {/* HERO — R3F WebGL object + bold art-directed type */}
        <WebGLHero />

        {/* MARQUEE — service areas / brand highlights */}
        {marquee.length > 0 ? (
          <div className="overflow-hidden border-y py-5" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
            <div className="flex w-max" style={{ animation: "sc-marquee 40s linear infinite" }}>
              {[...marquee, ...marquee, ...marquee].map((n, i) => (
                <span key={i} className="flex items-center gap-6 px-6 font-[family-name:var(--font-display)] font-semibold uppercase" style={{ fontSize: "1.4rem", letterSpacing: "-0.01em", color: "var(--ink-faint)" }}>
                  {n}<span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>&bull;</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* PINNED STATEMENT — GSAP ScrollTrigger scrub */}
        {pinned?.text ? (
          <PinnedStatement text={pinned.text} accentWord={pinned.accent_word} />
        ) : null}

        {/* VALUE — what you get */}
        {valueProps.length > 0 ? (
          <section id="value" className="section">
            <Wrap>
              <div className="mb-12 md:mb-16">
                <span className="t-mono mb-5 block">What you get</span>
                <CutHeading text="Everything your business needs to win online." className="t-h2 max-w-[18ch]" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {valueProps.map((v, i) => (
                  <Reveal key={v.title} delay={(i % 2) * 0.08} className={i % 2 === 1 ? "md:mt-10" : ""}>
                    <div className="flex h-full flex-col gap-4 p-7 md:p-9" style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
                      <span className="h-1.5 w-7 rounded-full" style={{ background: "var(--volt)" }} aria-hidden />
                      <h3 className="t-h3" style={{ color: "var(--ink)" }}>{v.title}</h3>
                      <p className="t-body">{v.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Wrap>
          </section>
        ) : null}

        {/* METHOD — how it works */}
        {steps.length > 0 ? (
          <section id="method" className="section">
            <Wrap>
              <div className="mb-14 md:mb-20">
                <span className="t-mono mb-5 block">How it works</span>
                <CutHeading text="Built around your business, then put to work." className="t-h2 max-w-[22ch]" />
              </div>
              {steps.map((s, i) => (
                <Reveal key={s.step} delay={i * 0.05}>
                  <div className="group grid grid-cols-1 items-start gap-y-4 border-t py-[clamp(2rem,4vw,3.25rem)] md:grid-cols-12" style={{ borderColor: "var(--line)" }}>
                    <div className="md:col-span-2">
                      <span className="font-[family-name:var(--font-display)] transition-colors duration-500 group-hover:[color:var(--volt)]" style={{ fontSize: "clamp(2.4rem,4.5vw,3.8rem)", color: "var(--ink-faint)", letterSpacing: "-0.02em", lineHeight: 1, fontWeight: 700 }}>{s.step}</span>
                    </div>
                    <div className="md:col-span-4 md:col-start-3"><h3 className="t-h3" style={{ color: "var(--ink)" }}>{s.title}</h3></div>
                    <div className="md:col-span-5 md:col-start-8"><p className="t-body">{s.description}</p></div>
                  </div>
                </Reveal>
              ))}
            </Wrap>
          </section>
        ) : null}

        {/* TESTIMONIALS */}
        {testimonials.length > 0 ? (
          <section className="section-tight">
            <Wrap>
              <div className="mb-12 md:mb-16"><CutHeading text="What customers say." className="t-h2" /></div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {testimonials.map((t, i) => (
                  <Reveal key={i} delay={(i % 2) * 0.08} className={i % 2 === 1 ? "md:mt-10" : ""}>
                    <figure className="flex h-full flex-col justify-between p-7 md:p-9" style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
                      <blockquote className="font-[family-name:var(--font-body)] font-medium" style={{ color: "var(--ink)", fontSize: "clamp(1.15rem,1.6vw,1.45rem)", lineHeight: 1.45, textWrap: "balance" }}>&ldquo;{t.quote}&rdquo;</blockquote>
                      <figcaption className="mt-8 flex items-center gap-3">
                        <span className="h-1.5 w-6 rounded-full" style={{ background: "var(--volt)" }} aria-hidden />
                        <span className="t-mono" style={{ color: "var(--ink)" }}>{t.author}</span>
                        {t.location ? <span className="t-mono">{t.location}</span> : null}
                      </figcaption>
                    </figure>
                  </Reveal>
                ))}
              </div>
            </Wrap>
          </section>
        ) : null}

        {/* BOOKING — A2P-compliant form, server-rendered in page.tsx */}
        {booking}

        {/* CTA — 21st floating-icons hero, scrolls to the booking form */}
        {cta?.title ? (
          <section id="contact" style={{ borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
            <FloatingIconsHero
              kicker={cta.kicker || brand.company}
              title={cta.title}
              subtitle={cta.subtitle ?? ""}
              ctaText={cta.button || "Get started"}
              onCtaClick={() => scrollToAnchor("#book")}
              icons={CTA_ICONS}
            />
          </section>
        ) : null}

        {/* FOOTER — 21st CinematicFooter (curtain reveal) */}
        <CinematicFooter />
      </main>
    </LenisProvider>
  );
}

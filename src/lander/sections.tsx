"use client";

// The section components the registry renders.
//
// PORTABILITY IS A HARD CONSTRAINT: these are vendored verbatim into the hub so
// its live preview renders the SAME components the deployed site does. A preview
// that merely approximates the site is worse than none, because it teaches the
// operator to trust something that is not true. So these components must not
// import brand-config.json, gsap, lenis, or anything else specific to either
// repo. They take props and read CSS custom properties for theming, which is how
// one set of components serves both.
//
// Theming comes entirely from the vars the brand kit already sets: --paper,
// --paper-2, --ink, --ink-soft, --ink-faint, --line, --volt, --volt-text,
// --on-accent, --font-display, --font-body.

import * as React from "react";

// ---------------------------------------------------------------- primitives

function Wrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[var(--maxw,92rem)] px-[var(--margin,clamp(1.25rem,5vw,5rem))] ${className}`}>{children}</div>;
}

// Display size as a function of headline LENGTH. Same rule as the live hero:
// the copy is generated and varies wildly, so one clamp cannot serve a 3-word
// and a 12-word headline. Ceilings stay at or under the 6rem display cap.
export function headlineScale(text: string): string {
  const n = (text || "").trim().length;
  if (n <= 24) return "clamp(2.6rem, 6vw, 5.75rem)";
  if (n <= 40) return "clamp(2.4rem, 5vw, 4.75rem)";
  if (n <= 62) return "clamp(2.1rem, 4.2vw, 3.9rem)";
  return "clamp(1.85rem, 3.4vw, 3.1rem)";
}

function Display({ text, className = "", style }: { text: string; className?: string; style?: React.CSSProperties }) {
  return (
    <h2
      className={`font-[family-name:var(--font-display)] font-bold uppercase ${className}`}
      style={{ fontSize: headlineScale(text), lineHeight: 0.95, letterSpacing: "0.005em", textWrap: "balance", color: "var(--ink)", ...style }}
    >
      {text}
    </h2>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <span
      className="mb-5 block font-[family-name:var(--font-mono,ui-monospace)] uppercase"
      style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "var(--ink-soft)" }}
    >
      {children}
    </span>
  );
}

function Body({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p className={`font-[family-name:var(--font-body)] ${className}`}
       style={{ fontSize: "clamp(1rem,1.1vw,1.2rem)", lineHeight: 1.6, color: "var(--ink-soft)", maxWidth: "56ch", textWrap: "pretty" }}>
      {children}
    </p>
  );
}

const SECTION_PAD = { paddingBlock: "calc(clamp(5rem,11vw,11rem) * var(--section-scale, 1))" } as const;

// ------------------------------------------------------------------ sections

export type SectionProps<T> = T & {
  /** Set by the editor so click-to-edit can address the right field. Never set
   *  on the deployed site, where these attributes are simply absent. */
  editable?: boolean;
};

// Marks a text node as inline-editable. On the deployed site `editable` is
// false, so nothing is added to the markup at all — the editor affordance cannot
// leak into a client's page.
function ed(editable: boolean | undefined, path: string) {
  return editable ? { "data-edit-path": path, tabIndex: 0, role: "textbox" as const } : {};
}

export function HeroSection({
  kicker, headline, lead, primaryCta, primaryHref, secondaryCta, secondaryHref,
  media, image, editable, objectSlot,
}: SectionProps<{
  kicker: string; headline: string; lead: string;
  primaryCta: string; primaryHref: string; secondaryCta: string; secondaryHref: string;
  media: "object" | "image" | "none"; image?: { src: string; alt: string; width?: number; height?: number };
  /** The R3F scene, injected by the host so this file stays dependency-free. */
  objectSlot?: React.ReactNode;
}>) {
  const feather = "radial-gradient(closest-side at 50% 50%, #000 58%, rgba(0,0,0,0.55) 78%, transparent 100%)";
  const wash =
    "linear-gradient(to top, var(--paper) 0%, var(--paper) 80%," +
    " color-mix(in srgb, var(--paper) 55%, transparent) 92%, transparent 100%)";
  const hasMedia = media !== "none";

  return (
    <section
      className="relative flex min-h-[100dvh] w-full flex-col justify-end overflow-hidden pb-[clamp(2.5rem,6vh,4.5rem)] pt-44"
      style={{ background: "var(--paper)" }}
    >
      {/* Media gets its own zone — right column on desktop, a band on mobile —
          so the type column can never collide with it whatever the copy length. */}
      {hasMedia ? (
        <div className="absolute inset-x-0 top-[14%] z-0 h-[38%] md:inset-y-0 md:top-0 md:left-[60%] md:h-auto"
             style={{ maskImage: feather, WebkitMaskImage: feather }}>
          {media === "object" ? objectSlot : null}
          {media === "image" && image?.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.src} alt={image.alt} width={image.width} height={image.height}
                 className="h-full w-full object-contain" />
          ) : null}
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-40" style={{ background: "linear-gradient(180deg, var(--paper) 40%, transparent)" }} />

      <div className="relative z-10">
        {hasMedia ? (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-[-2rem] top-[-24%] -z-10 md:hidden" style={{ background: wash }} />
        ) : null}
        <Wrap>
          <div className="md:max-w-[56%]">
            {kicker ? (
              <p className="mb-6 font-[family-name:var(--font-mono,ui-monospace)] uppercase"
                 style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "var(--ink-soft)" }}
                 {...ed(editable, "kicker")}>{kicker}</p>
            ) : null}
            <h1 className="font-[family-name:var(--font-display)] font-bold uppercase"
                style={{ fontSize: headlineScale(headline), lineHeight: 0.92, letterSpacing: "0.005em", textWrap: "balance", color: "var(--ink)" }}
                {...ed(editable, "headline")}>{headline}</h1>
            <div className="mt-7">
              {lead ? (
                <p className="font-[family-name:var(--font-body)]"
                   style={{ fontSize: "clamp(1.1rem,1.5vw,1.55rem)", lineHeight: 1.45, color: "var(--ink-soft)", maxWidth: "42ch", textWrap: "balance" }}
                   {...ed(editable, "lead")}>{lead}</p>
              ) : null}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {primaryCta ? <a href={primaryHref} className="btn btn-primary" {...ed(editable, "primaryCta")}>{primaryCta}</a> : null}
                {secondaryCta ? <a href={secondaryHref} className="btn btn-ghost" {...ed(editable, "secondaryCta")}>{secondaryCta}</a> : null}
              </div>
            </div>
          </div>
        </Wrap>
      </div>
    </section>
  );
}

export function MarqueeSection({ items }: SectionProps<{ items: string[] }>) {
  if (!items.length) return null;
  return (
    <div className="overflow-hidden border-y py-5" style={{ borderColor: "var(--line)", background: "var(--paper-2)" }}>
      <div className="flex w-max" style={{ animation: "sc-marquee 40s linear infinite" }}>
        {[...items, ...items, ...items].map((n, i) => (
          <span key={i} className="flex items-center gap-6 px-6 font-[family-name:var(--font-display)] font-semibold uppercase"
                style={{ fontSize: "1.4rem", letterSpacing: "-0.01em", color: "var(--ink-faint)" }}>
            {n}<span aria-hidden data-legibility-ignore style={{ color: "var(--volt)" }}>&bull;</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatementSection({ text, accentWord, editable }: SectionProps<{ text: string; accentWord: string }>) {
  const parts = accentWord && text.includes(accentWord) ? text.split(accentWord) : null;
  return (
    <section style={{ ...SECTION_PAD, background: "var(--paper)" }}>
      <Wrap>
        <p className="font-[family-name:var(--font-display)] uppercase"
           style={{ fontSize: headlineScale(text), lineHeight: 0.98, letterSpacing: "0.005em", maxWidth: "22ch", color: "var(--ink)" }}
           {...ed(editable, "text")}>
          {parts ? (<>{parts[0]}<em className="not-italic" style={{ background: "var(--volt)", color: "var(--on-accent)", padding: "0 0.1em" }}>{accentWord}</em>{parts.slice(1).join(accentWord)}</>) : text}
        </p>
      </Wrap>
    </section>
  );
}

export function ValuePropsSection({ kicker, heading, items, editable }: SectionProps<{ kicker: string; heading: string; items: { title: string; description: string }[] }>) {
  return (
    <section id="value" style={SECTION_PAD}>
      <Wrap>
        <div className="mb-12 md:mb-16">
          <span {...ed(editable, "kicker")}><Kicker>{kicker}</Kicker></span>
          <span {...ed(editable, "heading")}><Display text={heading} className="max-w-[18ch]" /></span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((v, i) => (
            <div key={i} className={`flex h-full min-w-0 flex-col gap-4 p-7 md:p-9 ${i % 2 === 1 ? "md:mt-10" : ""}`}
                 style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
              <span className="h-1.5 w-7 rounded-full" style={{ background: "var(--volt)" }} aria-hidden />
              <h3 className="font-[family-name:var(--font-display)] font-bold uppercase"
                  style={{ fontSize: "clamp(1.45rem,2.4vw,2.2rem)", lineHeight: 1.04, color: "var(--ink)" }}
                  {...ed(editable, `items.${i}.title`)}>{v.title}</h3>
              <span {...ed(editable, `items.${i}.description`)}><Body>{v.description}</Body></span>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

export function ProcessStepsSection({ kicker, heading, steps, editable }: SectionProps<{ kicker: string; heading: string; steps: { step: string; title: string; description: string }[] }>) {
  return (
    <section id="method" style={SECTION_PAD}>
      <Wrap>
        <div className="mb-14 md:mb-20">
          <span {...ed(editable, "kicker")}><Kicker>{kicker}</Kicker></span>
          <span {...ed(editable, "heading")}><Display text={heading} className="max-w-[22ch]" /></span>
        </div>
        {steps.map((s, i) => (
          <div key={i} className="grid grid-cols-1 items-start gap-y-4 border-t py-[clamp(2rem,4vw,3.25rem)] md:grid-cols-12" style={{ borderColor: "var(--line)" }}>
            <div className="min-w-0 md:col-span-2">
              <span className="font-[family-name:var(--font-display)] font-bold"
                    style={{ fontSize: "clamp(2.4rem,4.5vw,3.8rem)", color: "var(--ink-faint)", letterSpacing: "-0.02em", lineHeight: 1 }}
                    {...ed(editable, `steps.${i}.step`)}>{s.step}</span>
            </div>
            <div className="min-w-0 md:col-span-4 md:col-start-3">
              <h3 className="font-[family-name:var(--font-display)] font-bold uppercase"
                  style={{ fontSize: "clamp(1.45rem,2.4vw,2.2rem)", lineHeight: 1.04, color: "var(--ink)" }}
                  {...ed(editable, `steps.${i}.title`)}>{s.title}</h3>
            </div>
            <div className="min-w-0 md:col-span-5 md:col-start-8">
              <span {...ed(editable, `steps.${i}.description`)}><Body>{s.description}</Body></span>
            </div>
          </div>
        ))}
      </Wrap>
    </section>
  );
}

export function TestimonialsSection({ heading, items, editable }: SectionProps<{ heading: string; items: { quote: string; author: string; location: string }[] }>) {
  return (
    <section style={{ paddingBlock: "calc(clamp(3.5rem,7vw,7rem) * var(--section-scale, 1))" }}>
      <Wrap>
        <div className="mb-12 md:mb-16"><span {...ed(editable, "heading")}><Display text={heading} /></span></div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((t, i) => (
            <figure key={i} className={`flex h-full min-w-0 flex-col justify-between p-7 md:p-9 ${i % 2 === 1 ? "md:mt-10" : ""}`}
                    style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
              <blockquote className="font-[family-name:var(--font-body)] font-medium"
                          style={{ color: "var(--ink)", fontSize: "clamp(1.15rem,1.6vw,1.45rem)", lineHeight: 1.45, textWrap: "balance" }}
                          {...ed(editable, `items.${i}.quote`)}>&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-8 flex flex-wrap items-center gap-3">
                <span className="h-1.5 w-6 rounded-full" style={{ background: "var(--volt)" }} aria-hidden />
                <span className="font-[family-name:var(--font-mono,ui-monospace)] uppercase" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "var(--ink)" }}
                      {...ed(editable, `items.${i}.author`)}>{t.author}</span>
                {t.location ? <span className="font-[family-name:var(--font-mono,ui-monospace)] uppercase" style={{ fontSize: "0.68rem", letterSpacing: "0.18em", color: "var(--ink-soft)" }}
                                    {...ed(editable, `items.${i}.location`)}>{t.location}</span> : null}
              </figcaption>
            </figure>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

export function LogosSection({ label, items, editable }: SectionProps<{ label: string; items: string[] }>) {
  if (!items.length) return null;
  return (
    <section style={{ paddingBlock: "calc(clamp(2.5rem,5vw,4.5rem) * var(--section-scale, 1))", background: "var(--paper-2)" }}>
      <Wrap>
        <span {...ed(editable, "label")}><Kicker>{label}</Kicker></span>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
          {items.map((n, i) => (
            <span key={i} className="font-[family-name:var(--font-display)] font-semibold uppercase"
                  style={{ fontSize: "clamp(1rem,1.5vw,1.35rem)", color: "var(--ink-soft)", letterSpacing: "-0.01em" }}>{n}</span>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

export function FeatureCardsSection({ kicker, heading, cards, editable }: SectionProps<{ kicker: string; heading: string; cards: { title: string; body: string; metric: string }[] }>) {
  return (
    <section style={SECTION_PAD}>
      <Wrap>
        <div className="mb-12 md:mb-16">
          <span {...ed(editable, "kicker")}><Kicker>{kicker}</Kicker></span>
          <span {...ed(editable, "heading")}><Display text={heading} className="max-w-[20ch]" /></span>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {cards.map((c, i) => (
            <div key={i} className="flex min-w-0 flex-col gap-3 p-7 md:p-9" style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
              {c.metric ? (
                <span className="font-[family-name:var(--font-display)] font-bold" style={{ fontSize: "clamp(2rem,3vw,2.8rem)", lineHeight: 1, color: "var(--volt-text, var(--ink))" }}
                      {...ed(editable, `cards.${i}.metric`)}>{c.metric}</span>
              ) : null}
              <h3 className="font-[family-name:var(--font-display)] font-bold uppercase"
                  style={{ fontSize: "clamp(1.3rem,2vw,1.9rem)", lineHeight: 1.04, color: "var(--ink)" }}
                  {...ed(editable, `cards.${i}.title`)}>{c.title}</h3>
              <span {...ed(editable, `cards.${i}.body`)}><Body>{c.body}</Body></span>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

export function FaqSection({ kicker, heading, items, editable }: SectionProps<{ kicker: string; heading: string; items: { question: string; answer: string }[] }>) {
  return (
    <section id="faq" style={SECTION_PAD}>
      <Wrap className="max-w-[920px]">
        <div className="mb-12">
          <span {...ed(editable, "kicker")}><Kicker>{kicker}</Kicker></span>
          <span {...ed(editable, "heading")}><Display text={heading} /></span>
        </div>
        <ul className="space-y-4">
          {items.map((f, i) => (
            <li key={i} className="p-5" style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
              <details>
                <summary className="cursor-pointer font-[family-name:var(--font-display)] font-bold uppercase"
                         style={{ fontSize: "clamp(1.1rem,1.6vw,1.5rem)", lineHeight: 1.15, color: "var(--ink)" }}
                         {...ed(editable, `items.${i}.question`)}>{f.question}</summary>
                <span {...ed(editable, `items.${i}.answer`)}><Body className="mt-3">{f.answer}</Body></span>
              </details>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  );
}

export function CtaSection({ kicker, headline, subtitle, button, editable }: SectionProps<{ kicker: string; headline: string; subtitle: string; button: string }>) {
  return (
    <section id="contact" style={{ ...SECTION_PAD, borderTop: "1px solid var(--line)", background: "var(--paper)" }}>
      <Wrap className="text-center">
        <span {...ed(editable, "kicker")}><Kicker>{kicker}</Kicker></span>
        <span {...ed(editable, "headline")}><Display text={headline} className="mx-auto max-w-[20ch]" /></span>
        {subtitle ? (
          <p className="mx-auto mt-7 font-[family-name:var(--font-body)]"
             style={{ fontSize: "clamp(1.1rem,1.5vw,1.55rem)", lineHeight: 1.45, color: "var(--ink-soft)", maxWidth: "42ch" }}
             {...ed(editable, "subtitle")}>{subtitle}</p>
        ) : null}
        <div className="mt-10">
          <a href="#book" className="btn btn-primary" {...ed(editable, "button")}>{button}</a>
        </div>
      </Wrap>
    </section>
  );
}

/**
 * Booking — FIXED CONTRACT.
 *
 * The form itself is NOT spec-driven and is never generated: it is passed in as
 * `formSlot` by the host, which is what keeps the phone input and the consent
 * block together in one server-rendered file where the build-blocking A2P check
 * can see them. Only the framing copy is editable.
 *
 * (Deliberately describing those elements in prose rather than quoting their
 * markup: enforce-a2p.mjs scans raw file text and is rightly conservative, so a
 * quoted example in a comment reads as a real uncovered phone field.)
 */
export function BookingSection({ kicker, heading, subtitle, assurances, editable, formSlot }: SectionProps<{
  kicker: string; heading: string; subtitle: string; assurances: string[]; formSlot?: React.ReactNode;
}>) {
  return (
    <section id="book" className="scroll-mt-20" style={{ ...SECTION_PAD, background: "var(--paper-2)" }}>
      <Wrap>
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="min-w-0">
            <span {...ed(editable, "kicker")}><Kicker>{kicker}</Kicker></span>
            <span {...ed(editable, "heading")}><Display text={heading} className="max-w-[16ch]" /></span>
            {subtitle ? <span {...ed(editable, "subtitle")}><Body className="mt-5">{subtitle}</Body></span> : null}
            {assurances.length ? (
              <ul className="mt-8 space-y-3">
                {assurances.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 font-[family-name:var(--font-body)]" style={{ color: "var(--ink-soft)" }}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--volt)" }} aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="min-w-0">{formSlot}</div>
        </div>
      </Wrap>
    </section>
  );
}

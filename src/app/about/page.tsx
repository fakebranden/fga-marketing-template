import type { Metadata } from "next";
import Link from "next/link";
import brand from "../../../brand-config.json";
import { pageMeta } from "@/lib/seo";
import { ChatWidget } from "@/components/chat-widget";

export const metadata: Metadata = pageMeta(
  "/about",
  `About ${brand.company}`,
  brand.description ?? `${brand.company}. ${brand.tagline ?? ""}`.trim(),
);

// This is the default template /about page. The Generate-Site pipeline
// (Phase 5e) rewrites this file per client via the Claude Agent SDK using
// the niche reasoning rules in fga-pro-max-skill/reasoning/<niche>.md.
// The default version below is intentionally minimal so the build passes
// without any per-client copy.

export default function AboutPage() {
  return (
    <>
      <ChatWidget />
      <section style={{ background: "var(--primary)" }}>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-20">
          <h1 className="font-display text-white text-[44px] sm:text-[64px] leading-[0.98] max-w-3xl">
            About {brand.company}.
          </h1>
        </div>
      </section>

      <section style={{ background: "var(--surface-soft)" }}>
        <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-20 space-y-6">
          <span className="eyebrow">Our Story</span>
          <h2
            className="font-display text-[40px] sm:text-[56px] leading-tight"
            style={{ color: "var(--ink)" }}
          >
            Who we are
          </h2>
          <p
            className="text-base sm:text-lg leading-relaxed"
            style={{ color: "var(--ink-soft)" }}
          >
            {brand.description ??
              `${brand.company} serves ${
                (brand.service_areas ?? [])[0] ?? "our community"
              } and the surrounding area.`}
          </p>
          {brand.tagline ? (
            <p
              className="text-base sm:text-lg leading-relaxed"
              style={{ color: "var(--ink-soft)" }}
            >
              {brand.tagline}
            </p>
          ) : null}
        </div>
      </section>

      <section style={{ background: "var(--primary)" }} className="text-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-16 grid lg:grid-cols-[2fr_1fr] gap-10 items-center">
          <div>
            <h2 className="font-display text-[32px] sm:text-[44px] leading-tight mb-3 text-white">
              Ready to get started?
            </h2>
            <p className="text-white/85 text-base sm:text-lg max-w-2xl leading-relaxed">
              Tell us about your project and we&apos;ll send a custom quote.
            </p>
          </div>
          <div className="flex lg:justify-end">
            <Link href="/" className="btn-accent">
              Request a Quote →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

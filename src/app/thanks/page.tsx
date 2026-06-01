import type { Metadata } from "next";
import Link from "next/link";
import brand from "../../../brand-config.json";

export const metadata: Metadata = {
  title: `Thanks — request received | ${brand.company}`,
  description: `Your request was received. ${brand.company} typically replies within one business day.`,
  robots: { index: false, follow: false },
};

export default function ThanksPage() {
  const phone = brand.contact?.phone ?? "";
  const email = brand.contact?.email ?? "";
  return (
    <section style={{ background: "var(--primary)" }} className="text-white">
      <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-24 md:py-32 text-center">
        <div
          className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--accent)" }}
        >
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="none"
            stroke="white"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span className="eyebrow mb-3" style={{ color: "var(--accent)" }}>
          Request Received
        </span>
        <h1 className="font-display text-[44px] sm:text-[68px] leading-[0.98] mb-5 text-white">
          We&apos;ve got it.
        </h1>
        <p className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Your request landed in our inbox. A real human will look it over and
          reply within one business day.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/about" className="btn-outline-white">
            About {brand.company}
          </Link>
        </div>
        {phone || email ? (
          <div className="mt-12 pt-8 border-t border-white/20 text-white/75 text-sm">
            <p className="mb-1">Need to reach us in the meantime?</p>
            <p>
              {phone ? (
                <>
                  Phone: <strong className="text-white">{phone}</strong>
                  {email ? " · " : ""}
                </>
              ) : null}
              {email ? (
                <>
                  Email: <strong className="text-white">{email}</strong>
                </>
              ) : null}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

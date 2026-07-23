import type { Metadata } from "next";
import Link from "next/link";
import brand from "../../../brand-config.json";

export const metadata: Metadata = {
  title: `Thanks — request received | ${brand.company}`,
  description: `Your request was received. ${brand.company} typically replies within one business day.`,
  robots: { index: false, follow: false },
};

// `?status=call` is set by /api/book ONLY when the CRM write and every delivery
// sink failed. In that case the submission is genuinely not captured anywhere a
// human will see, so showing the normal confirmation would be a lie. We tell the
// visitor plainly and put the phone number in front of them instead.
export default async function ThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const failed = status === "call";
  const phone = brand.contact?.phone ?? "";
  const email = brand.contact?.email ?? "";
  const telHref = phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : "";

  return (
    <section style={{ background: "var(--primary)" }} className="text-white">
      <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-24 md:py-32 text-center">
        <div
          className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: failed ? "#c0392b" : "var(--accent)" }}
        >
          {failed ? (
            <svg
              viewBox="0 0 24 24"
              width="36"
              height="36"
              fill="none"
              stroke="white"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="7" x2="12" y2="14" />
              <line x1="12" y1="17.5" x2="12" y2="17.6" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              width="36"
              height="36"
              fill="none"
              stroke="white"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        {failed ? (
          <>
            <span className="eyebrow mb-3" style={{ color: "var(--accent)" }}>
              Please Call Us
            </span>
            <h1 className="font-display text-[44px] sm:text-[68px] leading-[0.98] mb-5 text-white">
              Your message didn&apos;t send.
            </h1>
            <p className="text-white/90 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Something went wrong on our end, so your request did not reach us.
              Please call now and we will take your information over the phone.
              Your time matters and we do not want you waiting on a reply that is
              not coming.
            </p>
            {phone ? (
              <div className="flex flex-wrap gap-3 justify-center">
                <a href={telHref} className="btn-outline-white text-lg">
                  Call {phone}
                </a>
              </div>
            ) : null}
            {email ? (
              <div className="mt-12 pt-8 border-t border-white/20 text-white/75 text-sm">
                <p className="mb-1">Prefer to write to us?</p>
                <p>
                  Email: <strong className="text-white">{email}</strong>
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <>
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
          </>
        )}
      </div>
    </section>
  );
}

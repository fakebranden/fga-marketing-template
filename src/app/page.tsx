import type { Metadata } from "next";
import brand from "../../brand-config.json";
import { JsonLd } from "@/components/json-ld";
import { serviceGraph, faqGraph, pageMeta } from "@/lib/seo";
import { SmsConsent } from "@/components/sms-consent";

export const metadata: Metadata = pageMeta(
  "/",
  `${brand.company} — Request a quote`,
  brand.description ?? `${brand.company}. ${brand.tagline ?? ""}`.trim(),
);

// A2P COMPLIANCE: this page collects a phone number on the booking form,
// so ChatWidget MUST NOT be rendered here. Keep it excluded.

export default function HomePage() {
  const faqs = brand.faqs ?? [];
  const tagline = brand.tagline ?? "";
  const subtitle = brand.subtitle ?? "";
  const phone = brand.contact?.phone ?? "";
  const email = brand.contact?.email ?? "";
  const serviceAreaOptions = brand.ghl?.service_area_options ?? brand.service_areas ?? [];

  return (
    <>
      <JsonLd data={serviceGraph()} />
      {faqs.length > 0 ? <JsonLd data={faqGraph(faqs)} /> : null}

      {/* HERO — primary color background with chunky headline */}
      <section style={{ background: "var(--primary)" }} className="text-white">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-16 md:py-20">
          <span
            className="eyebrow mb-3"
            style={{ color: "var(--accent)" }}
          >
            Request a Quote
          </span>
          <h1 className="font-display text-[52px] sm:text-[72px] leading-[0.96] mb-5 text-white">
            {tagline || "Tell us about your project."}
          </h1>
          {subtitle ? (
            <p className="text-white/90 text-base sm:text-lg max-w-xl leading-relaxed">
              {subtitle}
            </p>
          ) : null}
        </div>
      </section>

      {/* FORM + SIDEBAR — on cream */}
      <section style={{ background: "var(--surface-soft)" }}>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-20 grid lg:grid-cols-[2fr_1fr] gap-12">
          <form
            method="POST"
            action="/api/book"
            className="space-y-5 bg-white rounded-md border-2 p-8"
            style={{ borderColor: "var(--ink)" }}
          >
            {/* Honeypot — hidden from humans, bots fill it; server discards. */}
            <input
              type="text"
              name="website_url"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "-9999px",
                width: "1px",
                height: "1px",
                opacity: 0,
              }}
            />
            <FormField label="Your name" name="name" required />
            <div className="grid sm:grid-cols-2 gap-5">
              <FormField label="Email" name="email" type="email" required />
              <FormField label="Phone" name="phone" type="tel" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <FormField
                label="Event / project date"
                name="event_date"
                type="date"
              />
              <FormField
                label="Approx. guest / group count"
                name="guest_count"
                type="number"
              />
            </div>
            <FormField
              label="Event / project type"
              name="event_type"
              placeholder="What you're planning"
            />
            {serviceAreaOptions.length > 0 ? (
              <SelectField
                label="Service area"
                name="service_area"
                options={serviceAreaOptions}
                placeholder="Choose the area…"
              />
            ) : null}
            <FormField
              label="Address (street, venue, or building)"
              name="event_address"
              placeholder="Optional — helps us plan logistics"
            />
            <div>
              <label
                htmlFor="message"
                className="block font-display italic text-xs uppercase tracking-[0.1em] mb-2"
                style={{ color: "var(--primary-dark)" }}
              >
                Anything else we should know?
              </label>
              <textarea
                id="message"
                name="message"
                rows={5}
                className="w-full rounded-md border-2 bg-white px-4 py-3 text-sm focus:outline-none transition"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
                placeholder="Tell us the vibe."
              />
            </div>
            <SmsConsent />
            <button type="submit" className="btn-accent w-full">
              Send Request
            </button>
            <p className="text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              By submitting, you consent to be contacted about your request.
              We&apos;ll never share your info with third parties or affiliates
              for their marketing. See our{" "}
              <a
                href="/privacy"
                className="underline"
                style={{ color: "var(--primary)" }}
              >
                Privacy Policy
              </a>
              {" "}and{" "}
              <a
                href="/terms"
                className="underline"
                style={{ color: "var(--primary)" }}
              >
                Terms
              </a>
              .
            </p>
          </form>

          <aside className="space-y-5">
            <SidebarBlock title="How it works">
              <ol className="space-y-3 text-sm list-decimal pl-4" style={{ color: "var(--ink)" }}>
                <li>Submit the form with your details.</li>
                <li>We reply within one business day with a quote.</li>
                <li>Confirm and we schedule the work.</li>
              </ol>
            </SidebarBlock>
            {(brand.service_areas ?? []).length > 0 ? (
              <SidebarBlock title="Service Area">
                <ul className="space-y-1 text-sm" style={{ color: "var(--ink)" }}>
                  {brand.service_areas.map((a: string) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </SidebarBlock>
            ) : null}
            {phone || email ? (
              <SidebarBlock title="Prefer to call?">
                <div className="space-y-2 text-sm" style={{ color: "var(--ink)" }}>
                  {phone ? (
                    <div>
                      <span className="block text-mute text-[11px] uppercase tracking-[0.12em] mb-0.5">
                        Phone
                      </span>
                      {phone}
                    </div>
                  ) : null}
                  {email ? (
                    <div>
                      <span className="block text-mute text-[11px] uppercase tracking-[0.12em] mb-0.5">
                        Email
                      </span>
                      {email}
                    </div>
                  ) : null}
                </div>
              </SidebarBlock>
            ) : null}
          </aside>
        </div>
      </section>

      {/* FAQ — AEO-required: rendered as visible HTML AND in JSON-LD above */}
      {faqs.length > 0 ? (
        <section className="bg-white">
          <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-16">
            <span className="eyebrow mb-3">Common Questions</span>
            <h2
              className="font-display text-3xl sm:text-4xl mb-8"
              style={{ color: "var(--ink)" }}
            >
              Frequently asked
            </h2>
            <ul className="space-y-4">
              {faqs.map((f: { q: string; a: string }) => (
                <li
                  key={f.q}
                  className="rounded-md border p-5"
                  style={{ borderColor: "var(--line)" }}
                >
                  <details>
                    <summary
                      className="font-display text-lg cursor-pointer"
                      style={{ color: "var(--ink)" }}
                    >
                      {f.q}
                    </summary>
                    <p
                      className="text-sm mt-3 leading-relaxed"
                      style={{ color: "var(--ink-soft)" }}
                    >
                      {f.a}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}

function FormField({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block font-display italic text-xs uppercase tracking-[0.1em] mb-2"
        style={{ color: "var(--primary-dark)" }}
      >
        {label}
        {required && <span style={{ color: "var(--accent-dark)" }}> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-md border-2 bg-white px-4 py-3 text-sm focus:outline-none transition"
        style={{
          borderColor: "var(--line)",
          color: "var(--ink)",
        }}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  required = false,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block font-display italic text-xs uppercase tracking-[0.1em] mb-2"
        style={{ color: "var(--primary-dark)" }}
      >
        {label}
        {required && <span style={{ color: "var(--accent-dark)" }}> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="w-full rounded-md border-2 bg-white px-4 py-3 text-sm focus:outline-none transition"
        style={{
          borderColor: "var(--line)",
          color: "var(--ink)",
        }}
      >
        <option value="" disabled>
          {placeholder ?? "Select…"}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function SidebarBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-md border-2 p-6"
      style={{
        borderColor: "var(--ink)",
        background: "var(--surface)",
      }}
    >
      <h3
        className="font-display text-base uppercase mb-3"
        style={{ color: "var(--ink)", fontWeight: 900 }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

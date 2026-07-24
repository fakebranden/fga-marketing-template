import type { Metadata } from "next";
import brand from "../../brand-config.json";
import { JsonLd } from "@/components/json-ld";
import { serviceGraph, faqGraph, pageMeta } from "@/lib/seo";
import { SmsConsent } from "@/components/sms-consent";
import { SotyHome } from "@/components/showcase/SotyHome";
import { SpecHome } from "@/components/showcase/SpecHome";
import { loadLanderSpec } from "@/lib/lander-content";

export const metadata: Metadata = pageMeta(
  "/",
  `${brand.company} — Request a quote`,
  brand.description ?? `${brand.company}. ${brand.tagline ?? ""}`.trim(),
);

// A2P COMPLIANCE: the booking form collects a phone number, so the tel input
// and <SmsConsent /> MUST stay co-located in this file and ChatWidget MUST NOT
// render here (enforce-a2p.mjs blocks the build otherwise). The booking section
// is server-rendered here and handed to <SotyHome /> as the `booking` node so
// the rest of the premium landing can be a client component.

export default function HomePage() {
  // A published LanderSpec (content/lander.json, committed by the hub publish
  // step) takes over page composition. Absent, the brand-config composition
  // stands, so a client repo that has never been through the editor is
  // unaffected. Either way the booking controls below are the same
  // server-rendered, A2P-checked form.
  const lander = loadLanderSpec();
  const faqs = brand.faqs ?? [];
  const phone = brand.contact?.phone ?? "";
  const email = brand.contact?.email ?? "";
  const serviceAreaOptions = brand.ghl?.service_area_options ?? brand.service_areas ?? [];

  // G3b: how the lead form + booking calendar render. "native" keeps our styled
  // form (posting to /api/book, with the build-time A2P consent block and the
  // never-lose-a-lead fail-safe) and no calendar. "ghl" swaps in a direct GHL
  // iframe. A value is used verbatim if it is a full URL, else the standard
  // widget URL is built from the id.
  const formMode = brand.ghl?.form_mode ?? "native";
  const formId = brand.ghl?.form_id ?? "";
  const calendarMode = brand.ghl?.calendar_mode ?? "native";
  const calendarId = brand.ghl?.calendar_id ?? "";
  const ghlSrc = (kind: "form" | "calendar", v: string) =>
    /^https?:\/\//.test(v)
      ? v
      : `https://api.leadconnectorhq.com/widget/${kind === "form" ? "form" : "booking"}/${v}`;

  // The lead-form CONTROLS alone: no section wrapper, no framing copy, no id.
  //
  // Both page compositions render these same controls, which is what keeps the
  // phone input and the consent block together in this one server-rendered file
  // for the build-blocking A2P check. They differ only in who supplies the
  // framing: the brand-config composition wraps them in the section below, while
  // the spec-driven composition takes its heading and copy from the registry
  // booking section. Handing the whole section to both emitted a second
  // id="book" and a duplicate heading, which broke the #book anchor.
  const bookingControls = (
      <div className="grid gap-12 lg:grid-cols-[2fr_1fr]">
        {formMode === "ghl" && formId ? (
          <iframe
            src={ghlSrc("form", formId)}
            title="Request form"
            className="w-full"
            style={{ minHeight: "640px", border: "1px solid var(--line)", background: "var(--paper-2)" }}
          />
        ) : (
        <form
          method="POST"
          action="/api/book"
          className="space-y-5 p-8"
          style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}
        >
          {/* Honeypot — hidden from humans, bots fill it; server discards. */}
          <input
            type="text"
            name="website_url"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
          />
          <FormField label="Your name" name="name" required />
          <div className="grid sm:grid-cols-2 gap-5">
            <FormField label="Email" name="email" type="email" required />
            <FormField label="Phone" name="phone" type="tel" />
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            <FormField label="Event / project date" name="event_date" type="date" />
            <FormField label="Approx. guest / group count" name="guest_count" type="number" />
          </div>
          <FormField label="Event / project type" name="event_type" placeholder="What you're planning" />
          {serviceAreaOptions.length > 0 ? (
            <SelectField label="Service area" name="service_area" options={serviceAreaOptions} placeholder="Choose the area…" />
          ) : null}
          <FormField label="Address (street, venue, or building)" name="event_address" placeholder="Optional — helps us plan logistics" />
          <div>
            <label htmlFor="message" className="t-mono mb-2 block" style={{ color: "var(--ink)" }}>
              Anything else we should know?
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              className="w-full px-4 py-3 text-sm focus:outline-none transition"
              style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
              placeholder="Tell us the vibe."
            />
          </div>
          <SmsConsent />
          <button type="submit" className="btn btn-primary w-full justify-center">
            Send request
          </button>
          <p className="t-body" style={{ fontSize: "0.78rem", maxWidth: "none" }}>
            By submitting, you consent to be contacted about your request. We&apos;ll never share your
            info with third parties or affiliates for their marketing. See our{" "}
            <a href="/privacy" className="underline" style={{ color: "var(--volt-text)" }}>Privacy Policy</a>
            {" "}and{" "}
            <a href="/terms" className="underline" style={{ color: "var(--volt-text)" }}>Terms</a>.
          </p>
        </form>
        )}

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
                    <span className="block text-mute text-[11px] uppercase tracking-[0.12em] mb-0.5">Phone</span>
                    {phone}
                  </div>
                ) : null}
                {email ? (
                  <div>
                    <span className="block text-mute text-[11px] uppercase tracking-[0.12em] mb-0.5">Email</span>
                    {email}
                  </div>
                ) : null}
              </div>
            </SidebarBlock>
          ) : null}
        </aside>
      </div>
  );

  const booking = (
    <>
      {/* BOOKING — A2P-compliant lead form */}
      <section id="book" className="section" style={{ background: "var(--paper)" }}>
        <div className="wrap">
          <div className="mb-12">
            <span className="t-mono mb-5 block">Get started</span>
            <h2 className="t-h2 max-w-[24ch]">Tell us about your project.</h2>
          </div>
          {bookingControls}
        </div>
      </section>

      {/* BOOKING CALENDAR — only when the operator chose a GHL calendar embed
          (spec §7 G3b/G4: direct iframe, never a vendor JS loader). */}
      {calendarMode === "ghl" && calendarId ? (
        <section id="book-call" className="section" style={{ background: "var(--paper-2)" }}>
          <div className="wrap">
            <div className="mb-8">
              <span className="t-mono mb-5 block">Book a time</span>
              <h2 className="t-h2 max-w-[24ch]">Pick a slot that works.</h2>
            </div>
            <iframe
              src={ghlSrc("calendar", calendarId)}
              title="Booking calendar"
              className="w-full"
              style={{ minHeight: "700px", border: "1px solid var(--line)", background: "var(--paper)" }}
            />
          </div>
        </section>
      ) : null}

      {/* FAQ — AEO-required: visible HTML AND JSON-LD (rendered in HomePage) */}
      {faqs.length > 0 ? (
        <section className="section-tight" style={{ background: "var(--paper-2)" }}>
          <div className="wrap max-w-[920px]">
            <span className="t-mono mb-5 block">Common questions</span>
            <h2 className="t-h2 mb-10">Frequently asked</h2>
            <ul className="space-y-4">
              {faqs.map((f: { q: string; a: string }) => (
                <li key={f.q} className="p-5" style={{ border: "1px solid var(--line)", background: "var(--paper)" }}>
                  <details>
                    <summary className="t-h3 cursor-pointer" style={{ color: "var(--ink)" }}>{f.q}</summary>
                    <p className="t-body mt-3">{f.a}</p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );

  return (
    <>
      <JsonLd data={serviceGraph()} />
      {faqs.length > 0 ? <JsonLd data={faqGraph(faqs)} /> : null}
      {lander
        ? <SpecHome spec={lander.spec} booking={bookingControls} />
        : <SotyHome booking={booking} />}
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
      <label htmlFor={name} className="t-mono mb-2 block" style={{ color: "var(--ink)" }}>
        {label}
        {required && <span style={{ color: "var(--volt-text)" }}> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-sm focus:outline-none transition"
        style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
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
      <label htmlFor={name} className="t-mono mb-2 block" style={{ color: "var(--ink)" }}>
        {label}
        {required && <span style={{ color: "var(--volt-text)" }}> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className="w-full px-4 py-3 text-sm focus:outline-none transition"
        style={{ border: "1px solid var(--line)", background: "var(--paper)", color: "var(--ink)" }}
      >
        <option value="" disabled>{placeholder ?? "Select…"}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
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
    <div className="p-6" style={{ border: "1px solid var(--line)", background: "var(--paper-2)" }}>
      <h3 className="t-mono mb-3" style={{ color: "var(--ink)" }}>{title}</h3>
      {children}
    </div>
  );
}

import brand from "../../brand-config.json";
import Link from "next/link";

/**
 * CTIA / A2P-compliant SMS consent block.
 *
 * Renders the visible disclosure + an UNCHECKED opt-in checkbox. Per
 * carrier compliance rules, consent must be explicit and cannot be a
 * condition of completing the form — the checkbox is NOT `required`
 * (the booking still submits without it). The server-side handler
 * (/api/book) is the only place that converts a checked box into the
 * "SMS Opt-In" tag.
 *
 * Language references `brand.legal_entity` + `brand.dba` from
 * brand-config.json — these MUST match the entity/DBA filed with the
 * carrier's A2P submission, otherwise carriers reject campaigns for
 * "inconsistency between opt-in flow and registered samples."
 *
 * Hard rule (per reference_sms_a2p_compliance):
 *   Every <input type="tel"> on the site must be in the same component
 *   tree as a <SmsConsent /> import. The enforce-a2p.mjs build script
 *   greps for tel inputs and fails the build if SmsConsent is missing.
 */
export function SmsConsent() {
  return (
    <div
      className="rounded-md p-4 text-[13px] leading-relaxed"
      style={{
        background: "var(--surface-soft)",
        border: "1px solid var(--line)",
        color: "var(--ink)",
      }}
    >
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="sms_consent"
          value="yes"
          className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer"
          style={{ accentColor: "var(--accent)" }}
        />
        <span>
          <strong
            className="font-display uppercase tracking-tight text-[14px] block mb-1.5"
            style={{ color: "var(--ink)" }}
          >
            Text Message Updates (optional)
          </strong>
          By checking this box and providing my phone number, I consent to
          receive recurring informational and promotional text messages from{" "}
          <strong>{brand.legal_entity}</strong>
          {brand.dba && brand.dba !== brand.legal_entity ? (
            <> (d/b/a {brand.dba})</>
          ) : null}{" "}
          at the number provided, including via automated technology. Message
          frequency varies. Message and data rates may apply. Consent is not
          a condition of purchase. Reply <strong>STOP</strong> to unsubscribe
          at any time, or <strong>HELP</strong> for assistance. See our{" "}
          <Link
            href="/terms"
            className="underline"
            style={{ color: "var(--primary)" }}
          >
            SMS Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline"
            style={{ color: "var(--primary)" }}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

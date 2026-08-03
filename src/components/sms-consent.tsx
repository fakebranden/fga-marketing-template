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

/**
 * The SMS Terms / Privacy links inside the consent sentence.
 *
 * `color: inherit` is LOAD-BEARING and is not a style preference. These two
 * links were `var(--primary)`, which is a SURFACE/fill token, not a text
 * token. On fga-marketing-site-dyre-athletics `colors.primary` (#0a0a0a) and
 * `colors.surface_soft` (#0a0a0a) are the same value, so the links measured
 * **1.00:1** against the block they sit on and the sentence shipped as
 * "See our ⬛ and ⬛."
 *
 * That is an A2P exposure, not only a WCAG 1.4.3 failure: the carrier
 * registration requires the SMS Terms and Privacy links to be present AND
 * legible at the point of consent.
 *
 * Swapping to `var(--accent-text)` (what DYRE did locally) fixes that one
 * client but is NOT structurally safe upstream. Measured against each live
 * config's own `surface_soft` on 2026-08-03:
 *
 *   franchi-law   accent_text #705f3b → 4.62:1   (0.12 above the AA floor)
 *   e2e-verify    accent_text #ec0200 → 4.59:1   (0.09 above the AA floor)
 *   this template accent_text ABSENT → var() is invalid, colour undefined
 *
 * So `inherit` instead. It resolves to the `--ink` the wrapper below already
 * declares on `--surface-soft`, which makes the links' contrast IDENTICAL to
 * the contrast of the sentence containing them, by construction. A future
 * client cannot give the links a contrast the surrounding prose does not
 * already have, whatever their palette does. `enforce-a2p.mjs` gates that one
 * remaining pairing (ink vs surface_soft) at build time.
 *
 * Because colour no longer distinguishes the links, they carry underline +
 * weight instead, which is what WCAG 1.4.1 asks for anyway.
 */
const CONSENT_LINK_CLASS = "underline underline-offset-2 font-semibold";
const CONSENT_LINK_STYLE = { color: "inherit" } as const;

export function SmsConsent() {
  return (
    <div
      // Corner follows the brand token instead of a hardcoded `rounded-md`
      // (6px), which was a third corner value on a page whose buttons and pills
      // are driven by --radius. One radius system per site.
      // Presentation only — the consent PROSE below is carrier-matched and
      // stays byte-identical.
      className="rounded-[var(--radius,4px)] p-4 text-[13px] leading-relaxed"
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
            className={CONSENT_LINK_CLASS}
            style={CONSENT_LINK_STYLE}
          >
            SMS Terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className={CONSENT_LINK_CLASS}
            style={CONSENT_LINK_STYLE}
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

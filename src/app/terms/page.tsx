import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ChatWidget } from "@/components/chat-widget";
import brand from "../../../brand-config.json";

export const metadata: Metadata = pageMeta(
  "/terms",
  "Terms of Service & SMS Terms",
  `Terms of Service, booking terms, and SMS messaging terms for ${brand.company} (${brand.legal_entity}).`,
);

export default function TermsPage() {
  const helpEmail = brand.a2p?.help_email_override || brand.contact?.email || "";
  const helpPhone = brand.a2p?.help_phone_override || brand.contact?.phone || "";
  const sampleMessages = brand.a2p?.sample_messages ?? [];
  const frequencyDisclosure =
    brand.a2p?.frequency ?? "Message frequency varies based on Your interactions with Us and active promotions.";
  return (
    // Ground is the brand SURFACE token, not a hardcoded `bg-white`. See the
    // matching comment in privacy/page.tsx: with --ink white on a dark-ground
    // client, the whole Terms body rendered white on white at 1.00:1 on the
    // live site, carrier-matched SMS sections included. Prose untouched.
    <article style={{ background: "var(--surface)" }}>
      <ChatWidget />
      <header
        className="border-b"
        style={{ background: "var(--surface-soft)", borderColor: "var(--line)" }}
      >
        <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-16">
          <div
            className="tag-pill mb-3"
            style={{ background: "var(--ink)", color: "var(--surface)" }}
          >
            Legal
          </div>
          <h1
            className="font-display text-[36px] sm:text-[48px] leading-tight"
            style={{ color: "var(--ink)" }}
          >
            Terms of Service
          </h1>
          <p
            className="text-sm mt-2"
            style={{ color: "var(--ink-soft)" }}
          >
            Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[920px] px-4 sm:px-6 py-12 space-y-8">
        <P>
          These Terms of Service (&ldquo;Terms&rdquo;) govern Your use of the
          website at{" "}
          <A href={brand.canonical_url}>{brand.canonical_url}</A>{" "}
          (the &ldquo;Site&rdquo;) and the services offered by{" "}
          {brand.legal_entity}
          {brand.dba && brand.dba !== brand.legal_entity ? (
            <> (d/b/a {brand.dba})</>
          ) : null}{" "}
          (the &ldquo;Operator,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or
          &ldquo;our&rdquo;). By accessing or using the Site or our services,
          You agree to these Terms and our{" "}
          <A href="/privacy">Privacy Policy</A>.
        </P>

        <H2>1. Site Use</H2>
        <P>
          The Site is provided for personal and informational use and to
          enable You to request services. You agree not to misuse the Site,
          attempt to disrupt its operation, or use it in any manner that
          violates applicable law.
        </P>

        <H2>2. Bookings &amp; Quotes</H2>
        <P>
          Quotes submitted through the request form are non-binding requests.
          A booking is confirmed only once we send a written confirmation and
          You remit any agreed deposit. Final pricing and logistics are
          documented in the booking confirmation.
        </P>

        <H2>3. Deposits, Payments, and Cancellations</H2>
        <P>
          Where applicable, a deposit is required to confirm scheduled work
          and is non-refundable inside the cancellation window stated in the
          booking confirmation. The balance is due on the day of service
          unless otherwise agreed in writing.
        </P>

        <H2>4. SMS / Text Messaging Terms</H2>
        <P>
          These SMS Terms govern Your enrollment in and receipt of text
          messages from {brand.legal_entity}
          {brand.dba && brand.dba !== brand.legal_entity ? (
            <> (d/b/a {brand.dba})</>
          ) : null}
          . By providing Your mobile phone number and checking the SMS consent
          box on our request form (or otherwise giving Us express written
          consent), You agree to the following:
        </P>

        <H3>4.1 Program description</H3>
        <P>
          {brand.legal_entity} operates a recurring SMS program. Messages
          include both <strong>customer care messages</strong> (e.g., responses
          to support requests, follow-ups related to an existing inquiry) and{" "}
          <strong>promotional messages</strong> (e.g., special offers,
          discounts, and service announcements).
        </P>
        {brand.a2p?.program_description ? (
          <P>{brand.a2p.program_description}</P>
        ) : null}

        <H3>4.2 Sample messages</H3>
        <P>You may receive messages such as:</P>
        <UL>
          {sampleMessages.length > 0 ? (
            sampleMessages.map((m: string, i: number) => (
              <LI key={i}>&ldquo;{m}&rdquo;</LI>
            ))
          ) : (
            <LI>
              &ldquo;Hi! This is {brand.legal_entity}. We received your recent
              inquiry and a team member will follow up shortly. Reply STOP to
              unsubscribe.&rdquo;
            </LI>
          )}
        </UL>

        <H3>4.3 Frequency</H3>
        <P>{frequencyDisclosure}</P>

        <H3>4.4 Cost</H3>
        <P>
          <strong>Message and data rates may apply.</strong> Charges depend on
          Your wireless plan and carrier. Please contact Your wireless carrier
          for details. Consent to receive messages is{" "}
          <strong>not a condition</strong> of purchasing any goods or services
          from Us.
        </P>

        <H3>4.5 Opt-Out (STOP)</H3>
        <P>
          You can cancel the SMS service at any time. Reply <strong>STOP</strong>
          {" "}to any message We send You. After You send the message
          &ldquo;STOP&rdquo; to Us, We will send You a message to confirm that
          You have been unsubscribed. After this, You will no longer receive
          SMS messages from Us. To rejoin, sign up as You did the first time,
          and We will start sending messages to You again.
        </P>

        <H3>4.6 Help (HELP)</H3>
        <P>
          If You experience any issues with the SMS program, reply{" "}
          <strong>HELP</strong> to any message We send You
          {helpEmail ? (
            <>
              , email <A href={`mailto:${helpEmail}`}>{helpEmail}</A>
            </>
          ) : null}
          {helpPhone ? <>, or call {helpPhone}</> : null}.
        </P>

        <H3>4.7 Carriers</H3>
        <P>
          Carriers are not liable for delayed or undelivered messages. The
          SMS program is available on most major U.S. wireless carriers but
          carriers may change supported networks at any time.
        </P>

        <H3>4.8 Mobile Information &amp; Privacy</H3>
        <P>
          <strong>
            No mobile information collected through SMS opt-in (phone number,
            consent timestamp, opt-in source) will be shared with third parties
            or affiliates for marketing or promotional purposes.
          </strong>{" "}
          For additional detail on how We handle Your information, see our{" "}
          <A href="/privacy">Privacy Policy</A>.
        </P>

        <H2>5. Intellectual Property</H2>
        <P>
          All content of this Site is provided for personal and informational
          use. Reproduction, redistribution, or commercial use of Site content
          without written consent is prohibited.
        </P>

        <H2>6. Limitation of Liability</H2>
        <P>
          To the maximum extent permitted by law, the Operator&apos;s
          liability for any claim arising from the use of this Site or the
          services offered shall not exceed the amount paid by the client for
          the specific engagement giving rise to the claim. The Operator is
          not liable for indirect, incidental, or consequential damages.
        </P>

        <H2>7. Changes to These Terms</H2>
        <P>
          We may update these Terms periodically. The &ldquo;Last updated&rdquo;
          date at the top of this page reflects the most recent revision.
          Continued use of the Site or the SMS program after a change
          constitutes acceptance of the revised Terms.
        </P>

        <H2>8. Contact</H2>
        <P>For questions about these Terms or our SMS program:</P>
        <UL>
          {helpEmail ? (
            <LI>
              By email: <A href={`mailto:${helpEmail}`}>{helpEmail}</A>
            </LI>
          ) : null}
          {helpPhone ? <LI>By phone: {helpPhone}</LI> : null}
          <LI>
            Business name: {brand.legal_entity}
            {brand.dba && brand.dba !== brand.legal_entity ? (
              <> (d/b/a {brand.dba})</>
            ) : null}
          </LI>
        </UL>
      </div>
    </article>
  );
}

// --- Prose primitives ---

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-display text-2xl sm:text-3xl uppercase tracking-tight pt-6"
      style={{ color: "var(--ink)" }}
    >
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="font-display text-xl uppercase tracking-tight pt-4"
      style={{ color: "var(--ink)" }}
    >
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[15px] leading-relaxed"
      style={{ color: "var(--ink)" }}
    >
      {children}
    </p>
  );
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul
      className="list-disc pl-6 space-y-2 text-[15px] leading-relaxed"
      style={{ color: "var(--ink)" }}
    >
      {children}
    </ul>
  );
}

function LI({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      // Same structural fix as the SmsConsent links: `inherit` ties these to
      // the --ink the page body already uses, so an in-policy link can never
      // have a contrast the prose around it does not already have. --primary
      // is a SURFACE token and measured 1.00:1 on dyre-athletics. Underline
      // plus weight carry the affordance now that colour does not.
      className="underline underline-offset-2 font-semibold"
      style={{ color: "inherit" }}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

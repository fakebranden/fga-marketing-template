import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { ChatWidget } from "@/components/chat-widget";
import brand from "../../../brand-config.json";

export const metadata: Metadata = pageMeta(
  "/privacy",
  "Privacy Policy",
  `Privacy Policy for ${brand.company} — describes the collection, use, and disclosure of your information when you use our Service.`,
);

export default function PrivacyPage() {
  const helpEmail = brand.a2p?.help_email_override || brand.contact?.email || "";
  const helpPhone = brand.a2p?.help_phone_override || brand.contact?.phone || "";
  return (
    // Ground is the brand SURFACE token, not a hardcoded `bg-white`. Every
    // heading, paragraph and list on this page is painted `var(--ink)`, so a
    // literal white ground only works while --ink is dark. On a dark-ground
    // brand it inverts: measured 2026-08-03 on dyre-athletics (ink #ffffff),
    // the ENTIRE body of this page rendered white on white at 1.00:1 live,
    // policy prose, headings and every <strong> term alike.
    //
    // This page's SMS/A2P sections are carrier-matched and reviewed, so an
    // illegible privacy policy is a compliance exposure, not only WCAG 1.4.3.
    // The PROSE is untouched; only the ground token changed.
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
            Privacy Policy
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
          This Privacy Policy describes Our policies and procedures on the
          collection, use, and disclosure of Your information when You use the
          Service and tells You about Your privacy rights and how the law
          protects You.
        </P>
        <P>
          We use Your Personal data to provide and improve the Service. By using
          the Service, You agree to the collection and use of information in
          accordance with this Privacy Policy.
        </P>

        <H2>Definitions</H2>
        <P>For the purposes of this Privacy Policy:</P>
        <UL>
          <LI>
            <strong>Company</strong> (referred to as either &ldquo;the
            Company&rdquo;, &ldquo;We&rdquo;, &ldquo;Us&rdquo; or
            &ldquo;Our&rdquo; in this Agreement) refers to{" "}
            {brand.legal_entity}
            {brand.dba && brand.dba !== brand.legal_entity ? (
              <> (d/b/a {brand.dba})</>
            ) : null}.
          </LI>
          <LI>
            <strong>Personal Data</strong> is any information that relates to
            an identified or identifiable individual.
          </LI>
          <LI>
            <strong>Service</strong> refers to the Website.
          </LI>
          <LI>
            <strong>Website</strong> refers to {brand.company}, accessible from{" "}
            <A href={brand.canonical_url}>{brand.canonical_url}</A>.
          </LI>
          <LI>
            <strong>You</strong> means the individual accessing or using the
            Service.
          </LI>
        </UL>

        <H2>Collecting and Using Your Personal Data</H2>
        <H3>Types of Data Collected</H3>
        <H4>Personal Data</H4>
        <P>
          While using Our Service, We may ask You to provide Us with certain
          personally identifiable information that can be used to contact or
          identify You. Personally identifiable information may include, but
          is not limited to:
        </P>
        <UL>
          <LI>Email address</LI>
          <LI>First name and last name</LI>
          <LI>Phone number (only if You provide it on a form)</LI>
          <LI>Usage Data</LI>
        </UL>

        <H4>Usage Data</H4>
        <P>
          Usage Data is collected automatically when using the Service. It may
          include information such as Your Device&apos;s Internet Protocol
          address (e.g. IP address), browser type, the pages of our Service
          that You visit, the time and date of Your visit, the time spent on
          those pages, and other diagnostic data.
        </P>

        <H3>Use of Your Personal Data</H3>
        <P>The Company may use Personal Data for the following purposes:</P>
        <UL>
          <LI>
            <strong>To provide and maintain our Service</strong>, including to
            monitor the usage of our Service.
          </LI>
          <LI>
            <strong>To contact You:</strong> To contact You by email,
            telephone calls, SMS, or other equivalent forms of electronic
            communication regarding updates or informative communications
            related to the functionalities, products, or contracted services.
          </LI>
          <LI>
            <strong>To manage Your requests:</strong> To attend and manage
            Your requests to Us.
          </LI>
        </UL>

        <H2>Mobile Information and SMS Opt-In Data</H2>
        <P>
          <strong>
            No mobile information will be shared with third parties or
            affiliates for marketing or promotional purposes.
          </strong>{" "}
          All of the categories of personal data sharing described above
          exclude text-messaging originator opt-in data and consent; this
          information will not be shared with any third parties.
        </P>
        <P>
          When You opt in to receive text messages from {brand.legal_entity}
          {brand.dba && brand.dba !== brand.legal_entity ? (
            <> (d/b/a {brand.dba})</>
          ) : null}{" "}
          by checking the consent box on our request form or by otherwise
          providing express written consent, We collect Your mobile phone
          number, the consent timestamp, and the page on which You opted in.
          This information is used solely to send You the messages You
          requested and to maintain a compliance audit trail. Message
          frequency varies. Message and data rates may apply. Reply{" "}
          <strong>STOP</strong> to unsubscribe at any time, or{" "}
          <strong>HELP</strong> for assistance.
        </P>

        <H2>Retention of Your Personal Data</H2>
        <P>
          The Company will retain Your Personal Data only for as long as is
          necessary for the purposes set out in this Privacy Policy. We will
          retain and use Your Personal Data to the extent necessary to comply
          with our legal obligations, resolve disputes, and enforce our legal
          agreements and policies.
        </P>

        <H2>Security of Your Personal Data</H2>
        <P>
          The security of Your Personal Data is important to Us, but remember
          that no method of transmission over the Internet, or method of
          electronic storage, is 100% secure. While We strive to use
          commercially acceptable means to protect Your Personal Data, We
          cannot guarantee its absolute security.
        </P>

        <H2>Children&apos;s Privacy</H2>
        <P>
          Our Service does not address anyone under the age of 13. We do not
          knowingly collect personally identifiable information from anyone
          under the age of 13.
        </P>

        <H2>Changes to this Privacy Policy</H2>
        <P>
          We may update Our Privacy Policy from time to time. We will notify
          You of any changes by posting the new Privacy Policy on this page
          and updating the &ldquo;Last updated&rdquo; date at the top.
        </P>

        <H2>Contact Us</H2>
        <P>If you have any questions about this Privacy Policy, You can contact us:</P>
        <UL>
          {helpEmail ? (
            <LI>
              By email: <A href={`mailto:${helpEmail}`}>{helpEmail}</A>
            </LI>
          ) : null}
          {helpPhone ? <LI>By phone: {helpPhone}</LI> : null}
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

function H4({ children }: { children: React.ReactNode }) {
  return (
    <h4
      className="font-display italic text-base uppercase tracking-[0.06em] pt-3"
      // --ink, not --primary (a surface/fill token, which measured 1.00:1 on
      // dyre-athletics) and not --accent-text either. --accent-text is
      // SURFACE-DEPENDENT by definition, and this file's :root default for it
      // (#8A5A06) is a light-ground value: measured 3.55:1 against a #000000
      // surface, below the AA floor. generate-pages.mjs recomputes accent_text
      // per client so a GENERATED palette is fine, but this component must not
      // depend on that having run. H4 is already distinguished from H2/H3 by
      // being italic, so it does not need colour to carry the distinction.
      style={{ color: "var(--ink)" }}
    >
      {children}
    </h4>
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

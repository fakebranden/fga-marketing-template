// SEO + AEO (Answer Engine Optimization) helpers. Centralizes JSON-LD,
// canonical URL building, and structured-data graphs so every page emits
// the same baseline shape. Driven entirely by brand-config.json — the
// Generate-Site pipeline overwrites brand-config.json per client and this
// file picks up the niche-tuned LocalBusiness subtype + service-area
// schemas automatically.
//
// LocalBusiness subtype lookup loads from reasoning/_taxonomy.json at
// build time so the skill repo's niche list is the single source of truth.
//
// Schema priorities (per AEO research, May 2026):
//   1. LocalBusiness + niche subtype  (entity)
//   2. FAQPage                        (cited heavily by Perplexity/AI Overviews)
//   3. Menu / Service / Offer         (per niche)
//   4. Organization                   (parent brand)
//   5. WebSite                        (sitelinks searchbox)
//
// All graphs cross-reference by @id.

import brand from "../../brand-config.json";

const BASE = brand.canonical_url;
const COMPANY = brand.company;

// Default LocalBusiness subtype per niche. Mirrors reasoning/_taxonomy.json
// in fga-pro-max-skill — kept inline (rather than imported via TS) so the
// template builds cleanly without depending on the skill repo. The Generate
// pipeline regenerates this file per niche if a new niche is added.
const NICHE_LOCAL_BUSINESS_SUBTYPE: Record<string, string[]> = {
  lounge: ["LocalBusiness", "BarOrPub"],
  "restaurant-bar": ["LocalBusiness", "FoodEstablishment", "Restaurant"],
  "mobile-food-truck": ["LocalBusiness", "FoodEstablishment"],
  "appliance-retail": ["LocalBusiness", "Store", "HomeGoodsStore"],
  "agency-b2b": ["Organization", "ProfessionalService"],
  "med-spa-aesthetic": ["LocalBusiness", "HealthAndBeautyBusiness"],
  "plumber-hvac": ["LocalBusiness", "Plumber"],
  "auto-detail-mobile": ["LocalBusiness", "AutomotiveBusiness"],
  "barber-salon": ["LocalBusiness", "BeautySalon"],
};

function businessTypes(): string[] {
  const niche = (brand.niche ?? "").toString();
  return (
    NICHE_LOCAL_BUSINESS_SUBTYPE[niche] ?? ["LocalBusiness", "ProfessionalService"]
  );
}

// ----- shared @ids -----
export const ID = {
  org: `${BASE}/#organization`,
  business: `${BASE}/#business`,
  website: `${BASE}/#website`,
  faq: `${BASE}/#faq`,
  service: `${BASE}/#service`,
} as const;

// ----- helpers -----
export function canonical(path: string): string {
  if (path === "/" || path === "") return BASE;
  return BASE + (path.startsWith("/") ? path : `/${path}`);
}

function ogImage(): string {
  return `${BASE}/brand/og-default.png`;
}

// ----- top-level entity graph (rendered once in layout) -----
export function siteGraph() {
  const sameAs: string[] = [];
  const { instagram, facebook, tiktok, youtube, linkedin } = brand.socials ?? {};
  if (instagram) sameAs.push(`https://www.instagram.com/${instagram}`);
  if (facebook) sameAs.push(`https://www.facebook.com/${facebook}`);
  if (tiktok) sameAs.push(`https://www.tiktok.com/@${tiktok}`);
  if (youtube) sameAs.push(`https://www.youtube.com/@${youtube}`);
  if (linkedin) sameAs.push(`https://www.linkedin.com/company/${linkedin}`);

  const contact = brand.contact ?? {};
  const phone = contact.phone ?? "";
  const email = contact.email ?? "";

  const business: Record<string, unknown> = {
    "@type": businessTypes(),
    "@id": ID.business,
    name: COMPANY,
    alternateName: brand.dba ?? COMPANY,
    description: brand.description ?? `${COMPANY}. ${brand.tagline ?? ""}`.trim(),
    url: BASE,
    image: ogImage(),
    logo: { "@id": ID.org + "-logo" },
    parentOrganization: { "@id": ID.org },
    priceRange: "$$",
    areaServed: (brand.service_areas ?? []).map((area: string) => ({
      "@type": "Place",
      name: area,
    })),
    address: {
      "@type": "PostalAddress",
      addressLocality: contact.address_locality ?? "",
      addressRegion: contact.address_region ?? "",
      addressCountry: contact.address_country ?? "US",
    },
  };
  if (phone) business.telephone = phone;
  if (email) business.email = email;
  if (sameAs.length) business.sameAs = sameAs;
  business.potentialAction = {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: canonical("/"),
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    result: {
      "@type": "Reservation",
      name: `${COMPANY} booking`,
    },
  };

  const organization = {
    "@type": "Organization",
    "@id": ID.org,
    name: COMPANY,
    url: BASE,
    logo: {
      "@type": "ImageObject",
      "@id": ID.org + "-logo",
      url: `${BASE}${brand.logo_path ?? "/brand/logo.png"}`,
      width: 512,
      height: 512,
    },
  };

  const website = {
    "@type": "WebSite",
    "@id": ID.website,
    url: BASE,
    name: COMPANY,
    publisher: { "@id": ID.org },
    inLanguage: "en-US",
  };

  return {
    "@context": "https://schema.org",
    "@graph": [organization, business, website],
  };
}

// ----- FAQ schema -----
export type FaqEntry = { q: string; a: string };

export function faqGraph(entries: FaqEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": ID.faq,
    mainEntity: entries.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

// ----- Service schema (catering / events / generic service) -----
export function serviceGraph() {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": ID.service,
    name: `${COMPANY} — services`,
    description:
      brand.description ?? `${COMPANY} provides professional services for the surrounding service area.`,
    serviceType: brand.niche ?? "Local service",
    provider: { "@id": ID.business },
    areaServed: (brand.service_areas ?? []).map((area: string) => ({
      "@type": "Place",
      name: area,
    })),
    offers: {
      "@type": "Offer",
      url: canonical("/"),
      availability: "https://schema.org/InStock",
      priceCurrency: "USD",
    },
  };
}

// ----- Per-page metadata helpers -----
export function pageMeta(path: string, title: string, description: string) {
  const url = canonical(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: COMPANY,
      type: "website" as const,
      images: [{ url: ogImage(), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title,
      description,
      images: [ogImage()],
    },
  };
}

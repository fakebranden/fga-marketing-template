import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { JsonLd } from "@/components/json-ld";
import { siteGraph } from "@/lib/seo";
import brand from "../../brand-config.json";

// Default font pairing — overridden per-client at site-generation time if
// brand.fonts demands a different pair (e.g. Playfair + Source Sans for
// med-spa-aesthetic, Anton + Poppins for FGA itself). The CSS variables
// (--font-display, --font-body) referenced in globals.css mean this swap
// is non-breaking — the type stays consistent across niches.
const fontDisplay = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const fontBody = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const description =
  brand.description ??
  `${brand.company}. ${brand.tagline ?? ""}`.trim();

export const metadata: Metadata = {
  metadataBase: new URL(brand.canonical_url),
  title: {
    default: `${brand.company}${brand.tagline ? ` — ${brand.tagline}` : ""}`,
    template: `%s | ${brand.company}`,
  },
  description,
  applicationName: brand.company,
  authors: [{ name: brand.company, url: brand.canonical_url }],
  icons: {
    icon: [
      { url: brand.favicon_path ?? "/brand/favicon.ico", sizes: "any" },
      { url: brand.logo_path ?? "/brand/logo.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: brand.logo_path ?? "/brand/logo.png", sizes: "512x512" },
  },
  openGraph: {
    title: `${brand.company}${brand.tagline ? ` — ${brand.tagline}` : ""}`,
    description: brand.subtitle ?? description,
    siteName: brand.company,
    type: "website",
    locale: "en_US",
    url: brand.canonical_url,
    images: [{ url: "/brand/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.company}${brand.tagline ? ` — ${brand.tagline}` : ""}`,
    description: brand.subtitle ?? description,
    images: ["/brand/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: brand.canonical_url },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-ink">
        <JsonLd data={siteGraph()} />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

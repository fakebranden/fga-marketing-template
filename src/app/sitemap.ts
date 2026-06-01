import type { MetadataRoute } from "next";
import { canonical } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // Homepage IS the booking form (transactional) — highest crawl priority.
  // /menu and /book routes were removed and 301-redirect to / via next.config.
  return [
    { url: canonical("/"), lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: canonical("/about"), lastModified, changeFrequency: "monthly", priority: 0.7 },
    { url: canonical("/terms"), lastModified, changeFrequency: "yearly", priority: 0.2 },
    { url: canonical("/privacy"), lastModified, changeFrequency: "yearly", priority: 0.2 },
  ];
}

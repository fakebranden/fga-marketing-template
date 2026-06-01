import type { MetadataRoute } from "next";
import { canonical } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/thanks"],
      },
    ],
    sitemap: canonical("/sitemap.xml"),
    host: canonical("/").replace(/\/$/, ""),
  };
}

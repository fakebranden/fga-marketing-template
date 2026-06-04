"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FOOTER_LINKS, NAV } from "@/lib/nav";
import { BrandMark } from "./brand-mark";
import { Socials } from "./socials";
import brand from "../../brand-config.json";

export function SiteFooter() {
  const pathname = usePathname();
  const phone = brand.contact?.phone ?? "";
  const email = brand.contact?.email ?? "";
  const tagline = brand.tagline ?? "";
  // "/" ships the SOTY CinematicFooter; suppress the document-page footer there.
  if (pathname === "/") return null;
  return (
    <footer className="text-white" style={{ background: "var(--ink)" }}>
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <BrandMark size="md" />
          {tagline ? (
            <p className="text-white/75 text-sm leading-relaxed mt-5 max-w-sm">
              {tagline}
            </p>
          ) : null}
          <Socials
            className="mt-6"
            iconClassName="border-white/30 text-white/85 hover:text-white hover:border-white hover:bg-white/10"
          />
        </div>
        {NAV.length > 0 ? (
          <div>
            <div
              className="font-display italic text-[15px] uppercase mb-4"
              style={{ color: "var(--accent)", letterSpacing: "0.05em" }}
            >
              Explore
            </div>
            <ul className="space-y-2 text-sm">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-white/85 hover:text-white transition"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div />
        )}
        <div>
          <div
            className="font-display italic text-[15px] uppercase mb-4"
            style={{ color: "var(--accent)", letterSpacing: "0.05em" }}
          >
            Contact
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            {phone ? (
              <li>
                <span className="block text-white/55 text-[11px] uppercase tracking-[0.12em] mb-0.5">
                  Phone
                </span>
                {phone}
              </li>
            ) : null}
            {email ? (
              <li>
                <span className="block text-white/55 text-[11px] uppercase tracking-[0.12em] mb-0.5">
                  Email
                </span>
                {email}
              </li>
            ) : null}
            {(brand.service_areas ?? []).length > 0 ? (
              <li>
                <span className="block text-white/55 text-[11px] uppercase tracking-[0.12em] mb-0.5">
                  Service Area
                </span>
                {brand.service_areas.slice(0, 3).join(" · ")}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-white/60">
          <div>
            © {new Date().getFullYear()} {brand.company}. All rights reserved.
          </div>
          <ul className="flex gap-4">
            {FOOTER_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:text-white transition">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

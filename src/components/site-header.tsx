"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV } from "@/lib/nav";
import { BrandMark } from "./brand-mark";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // The marketing landing ("/") ships its own SOTY chrome (floating Nav +
  // CinematicFooter). Suppress the document-page header there.
  if (pathname === "/") return null;

  return (
    <header
      className="sticky top-0 z-50 text-white"
      style={{ background: "var(--primary)" }}
    >
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center">
          <BrandMark size="md" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-7">
          {NAV.filter((n) => !n.cta).map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`font-display italic text-[15px] font-bold uppercase tracking-wide transition ${
                  active ? "text-white" : "text-white/90 hover:text-white"
                }`}
                style={{ letterSpacing: "0.05em" }}
              >
                {item.short}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center">
          {NAV.filter((n) => n.cta).map((item) => (
            <Link key={item.href} href={item.href} className="btn-accent">
              {item.label}
            </Link>
          ))}
        </div>

        {/* Mobile toggle — only render when there are nav items to expose. */}
        {NAV.length > 0 && (
          <button
            type="button"
            className="lg:hidden inline-flex items-center justify-center rounded p-2 text-white"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        )}
      </div>

      {/* Mobile menu */}
      {open && NAV.length > 0 && (
        <div
          className="lg:hidden border-t border-white/15"
          style={{ background: "var(--primary)" }}
        >
          <nav
            className="mx-auto max-w-[1280px] px-4 sm:px-6 py-4 flex flex-col gap-2"
          >
            {NAV.map((item) => {
              if (item.cta) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="btn-accent mt-2 self-start"
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="font-display italic text-white text-base uppercase tracking-wide px-2 py-2"
                  style={{ letterSpacing: "0.05em" }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}

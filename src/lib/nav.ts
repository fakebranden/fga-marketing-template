export type NavItem = {
  href: string;
  label: string;
  short: string;
  external?: boolean;
  cta?: boolean;
};

// Site nav. The Generate-Site pipeline rewrites this per niche if the niche's
// recipe demands a different nav structure (e.g. restaurant-bar exposes a
// dedicated /menu route while mobile-food-truck keeps the home page as the
// booking form with no nav items). Empty NAV is intentional in the default
// template — site-header.tsx hides the hamburger when this is empty.
export const NAV: NavItem[] = [];

export const FOOTER_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
];

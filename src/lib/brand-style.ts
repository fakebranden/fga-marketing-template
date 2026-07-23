// Brand → runtime style wiring (design engine Increment 1).
//
// The template's CSS (globals.css) is written entirely against semantic custom
// properties: --primary / --accent / --ink / … for color, and --font-display /
// --font-body for type. Those have generic slate + amber + Fraunces/Inter
// defaults so the template renders standalone. This module turns the per-client
// brand-config.json `colors` + `fonts` into the overrides that make a generated
// site look like the real client.
//
// We apply the overrides as an INLINE style object on <html> (see layout.tsx),
// not by rewriting globals.css. Inline styles are SSR-rendered (no flash of the
// default palette) and win the cascade over both globals.css `:root` and
// next/font's class-injected vars without any specificity guessing.
//
// Pure + framework-free so it is unit-testable without React or the DOM.

// The template's default next/font pairing (self-hosted in layout.tsx). When a
// client's fonts match these we do NOT emit a Google Fonts <link> or override
// the font vars — next/font already serves them optimally.
export const DEFAULT_DISPLAY_FONT = "Fraunces";
export const DEFAULT_BODY_FONT = "Inter";

type BrandColors = Record<string, unknown> | undefined | null;
type BrandFonts =
  | {
      display?: unknown;
      body?: unknown;
      display_fallback?: unknown;
      body_fallback?: unknown;
    }
  | undefined
  | null;

const SERIF_FALLBACK = 'Georgia, "Times New Roman", serif';
const SANS_FALLBACK = 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

// snake_case brand-config color key → CSS custom property name.
//   primary_dark → --primary-dark
function colorKeyToVar(key: string): string {
  return `--${key.replace(/_/g, "-")}`;
}

function isHex(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim());
}

// Emit `--<token>: <hex>` for every valid hex in brand.colors. Non-hex / missing
// keys are skipped so the template default for that token stands in.
export function brandColorVars(colors: BrandColors): Record<string, string> {
  const out: Record<string, string> = {};
  if (!colors || typeof colors !== "object") return out;
  for (const [key, value] of Object.entries(colors)) {
    if (isHex(value)) out[colorKeyToVar(key)] = (value as string).trim();
  }
  return out;
}

function fontStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// True when the client's fonts differ from the template's self-hosted defaults
// (so we need to load them from Google + override the vars).
export function fontsAreCustom(fonts: BrandFonts): boolean {
  const display = fontStr(fonts?.display);
  const body = fontStr(fonts?.body);
  return (
    (!!display && display !== DEFAULT_DISPLAY_FONT) ||
    (!!body && body !== DEFAULT_BODY_FONT)
  );
}

// Emit `--font-display` / `--font-body` for custom fonts, each with a fallback
// stack so the render stays sane before the webfont loads. Returns {} when the
// fonts are the template defaults (next/font already drives the vars).
export function brandFontVars(fonts: BrandFonts): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fontsAreCustom(fonts)) return out;
  const display = fontStr(fonts?.display);
  const body = fontStr(fonts?.body);
  if (display) {
    const fb = fontStr(fonts?.display_fallback) ?? SERIF_FALLBACK;
    out["--font-display"] = `"${display}", ${fb}`;
  }
  if (body) {
    const fb = fontStr(fonts?.body_fallback) ?? SANS_FALLBACK;
    out["--font-body"] = `"${body}", ${fb}`;
  }
  return out;
}

// Build the Google Fonts CSS2 href for the client's custom fonts, or null when
// the fonts are the template defaults. We deliberately request the family with
// NO weight axis: an arbitrary operator-typed font may not carry a given weight,
// and css2 returns 400 (dropping the whole stylesheet) if any requested weight
// is missing. The family-only request always resolves; heavier display weights
// synthesize (faux-bold) until a later increment reads real axes from the token
// seeds. Display + body are de-duped when identical.
export function googleFontsHref(fonts: BrandFonts): string | null {
  if (!fontsAreCustom(fonts)) return null;
  const families: string[] = [];
  const display = fontStr(fonts?.display);
  const body = fontStr(fonts?.body);
  for (const f of [display, body]) {
    if (f && !families.includes(f)) families.push(f);
  }
  if (families.length === 0) return null;
  const params = families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}`);
  return `https://fonts.googleapis.com/css2?${params.join("&")}&display=swap`;
}

type BrandLayout =
  | { sectionScale?: unknown; maxWidthRem?: unknown }
  | undefined
  | null;

// Layout vars from URL inspiration (design engine Increment 3). ANTI-MIMICRY:
// a reference URL contributes STRUCTURE ONLY — never palette or type — so the
// only vars we ever emit from it are the section-padding scale and the content
// max-width. There is deliberately nothing else to return here.
export function brandLayoutVars(layout: BrandLayout): Record<string, string> {
  const out: Record<string, string> = {};
  if (!layout || typeof layout !== "object") return out;
  const scale = layout.sectionScale;
  if (typeof scale === "number" && Number.isFinite(scale)) out["--section-scale"] = String(scale);
  const maxw = layout.maxWidthRem;
  if (typeof maxw === "number" && Number.isFinite(maxw)) out["--maxw"] = `${maxw}rem`;
  return out;
}

// Convenience: the full inline style object for <html> — color vars + custom
// font vars + URL-inspired layout vars merged. Typed loosely (custom properties
// are not in CSSProperties).
export function brandStyleVars(brand: {
  colors?: BrandColors;
  fonts?: BrandFonts;
  layout?: BrandLayout;
}): Record<string, string> {
  return {
    ...brandColorVars(brand?.colors),
    ...brandFontVars(brand?.fonts),
    ...brandLayoutVars(brand?.layout),
  };
}

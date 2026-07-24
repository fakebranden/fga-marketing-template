// WCAG 2.2 contrast enforcement for the FINAL merged palette.
//
// Why this exists, and why it is NOT inside resolve-tokens.mjs:
// generate-pages.mjs merges in three layers — template default < reference-style
// seed < client brand kit. The kit overrides ink / accent / primary AFTER the
// seed resolves, so no guarantee made during seed resolution survives the merge.
// A 9-style x 4-kit x 9-pair audit on 2026-07-24 found 174 of 324 rendered
// color pairs below AA, including `.t-accent` / `.btn-primary` failing on ALL
// nine styles (accent_dark was just darken(accent, 0.2), ~1.3:1) and the live
// franchi-law lander shipping text at 1.26:1.
//
// resolve-tokens.mjs used `0.299r + 0.587g + 0.114b` (YIQ perceived brightness)
// with magic thresholds and called it a "readability guarantee". That is not a
// contrast ratio and does not predict AA. This module does the real thing:
// sRGB -> linear -> relative luminance -> (L1+0.05)/(L2+0.05).
//
// Repair strategy follows the brand register: preserve identity, fix legibility.
// Adjustments move along the color's OWN hue (HSL lightness) rather than sliding
// toward gray or snapping to black/white, so a repaired token still reads as the
// client's / style's color. Black or white is only ever the terminal endpoint of
// that same-hue ramp.

// ── sRGB / WCAG ────────────────────────────────────────────────────────────
function channels(hex) {
  const h = String(hex).trim().replace(/^#/, "");
  const full = h.length === 3 ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2] : h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function toHex({ r, g, b }) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function linearize(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// WCAG 2.x relative luminance (0..1). NOT the YIQ brightness the old resolver used.
export function relativeLuminance(hex) {
  const c = channels(hex);
  if (!c) return null;
  return 0.2126 * linearize(c.r) + 0.7152 * linearize(c.g) + 0.0722 * linearize(c.b);
}

// WCAG contrast ratio, 1..21. Order-independent.
export function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) return null;
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ── HSL (hue-preserving lightness moves) ───────────────────────────────────
function rgbToHsl(hex) {
  const c = channels(hex);
  if (!c) return null;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3) * 255, g: hue(h) * 255, b: hue(h - 1 / 3) * 255 };
}

function withLightness(hex, l, satScale = 1) {
  const hsl = rgbToHsl(hex);
  if (!hsl) return hex;
  return toHex(hslToRgb({
    h: hsl.h,
    s: Math.max(0, Math.min(1, hsl.s * satScale)),
    l: Math.max(0, Math.min(1, l)),
  }));
}

// ── repair primitives ──────────────────────────────────────────────────────
const STEPS = 200;

/**
 * Nearest color to `fg` ALONG ITS OWN HUE that meets `min` against every
 * background in `bgs`. Searches outward from the current lightness in both
 * directions and returns the first hit, so the repaired color is the smallest
 * identity-preserving change that satisfies AA. Returns `fg` unchanged when it
 * already passes, and the best available candidate if nothing fully qualifies
 * (unreachable in practice: one end of any hue ramp is black, the other white,
 * and for any background at least one of those clears 4.5:1).
 */
export function ensureContrast(fg, bgs, min = 4.5) {
  const backgrounds = (Array.isArray(bgs) ? bgs : [bgs]).filter(Boolean);
  if (!channels(fg) || backgrounds.length === 0) return fg;
  const worst = (c) => Math.min(...backgrounds.map((bg) => contrastRatio(c, bg) ?? 0));
  if (worst(fg) >= min) return fg;

  const hsl = rgbToHsl(fg);
  let best = fg;
  let bestRatio = worst(fg);
  for (let i = 1; i <= STEPS; i++) {
    const delta = i / STEPS;
    for (const l of [hsl.l - delta, hsl.l + delta]) {
      if (l < 0 || l > 1) continue;
      const cand = withLightness(fg, l);
      const ratio = worst(cand);
      if (ratio >= min) return cand;
      if (ratio > bestRatio) { bestRatio = ratio; best = cand; }
    }
  }
  return best;
}

/**
 * A text color to sit ON a colored background, expressed in the background's
 * OWN hue. Per the brand register: a deeper (or lighter) shade of the
 * background's hue, never a washed-out gray and never a reflexive black/white.
 *
 * `ensureContrast` deliberately returns the NEAREST passing color, which is
 * right when repairing a brand color the client chose but wrong when deriving a
 * fresh text color: stopping at exactly 4.5:1 produces timid mid-greys (a first
 * pass here returned #808080 on a navy band). So this aims for `aim` (AAA) when
 * the hue can reach it, then among the candidates that clear the target picks
 * the one CLOSEST in lightness to the background, which keeps the most hue
 * character while staying comfortably legible.
 */
export function onColor(bg, min = 4.5, aim = 7) {
  if (!channels(bg)) return "#000000";
  const hsl = rgbToHsl(bg);

  // Hold the hue, but damp saturation as the candidate moves away from the
  // background's lightness. Holding saturation flat turns a lightened dark navy
  // into a vivid periwinkle (a first pass produced #5ca2ff for band text);
  // damping yields a tint/shade — near-neutral carrying a hint of the brand hue,
  // which is what the brand register asks for.
  const candidates = [];
  let best = 0;
  for (let i = 0; i <= STEPS; i++) {
    const l = i / STEPS;
    const satScale = Math.max(0.15, 1 - 1.6 * Math.abs(l - hsl.l));
    const color = withLightness(bg, l, satScale);
    const ratio = contrastRatio(color, bg) ?? 0;
    candidates.push({ color, l, ratio });
    if (ratio > best) best = ratio;
  }

  // Never demand more than the hue can actually deliver against this background.
  const target = Math.min(Math.max(min, aim), best);
  const qualifying = candidates.filter((c) => c.ratio >= target);
  if (qualifying.length === 0) return best > 0 ? candidates.sort((a, b) => b.ratio - a.ratio)[0].color : "#000000";
  qualifying.sort((a, b) => Math.abs(a.l - hsl.l) - Math.abs(b.l - hsl.l));
  return qualifying[0].color;
}

// ── the pairs the template actually renders ────────────────────────────────
// Kept next to the enforcement so a CSS change that introduces a new pairing is
// a visible, reviewable edit here rather than a silent AA regression.
export const RENDERED_PAIRS = [
  { label: "body text", fg: "ink", bg: "surface", min: 4.5 },
  { label: "body text on alt section", fg: "ink", bg: "surface_soft", min: 4.5 },
  { label: "soft ink", fg: "ink_soft", bg: "surface", min: 4.5 },
  { label: "soft ink on alt section", fg: "ink_soft", bg: "surface_soft", min: 4.5 },
  { label: "muted text", fg: "mute", bg: "surface", min: 4.5 },
  { label: "muted text on alt section", fg: "mute", bg: "surface_soft", min: 4.5 },
  { label: "text on accent (.btn-accent/.btn-primary/.t-accent)", fg: "on_accent", bg: "accent", min: 4.5 },
  { label: "text on accent hover", fg: "on_accent", bg: "accent_dark", min: 4.5 },
  { label: "text on brand band", fg: "on_primary", bg: "primary", min: 4.5 },
  { label: "text on dark band", fg: "on_primary", bg: "primary_dark", min: 4.5 },
];

/**
 * Repair a merged palette in place-safe fashion (returns a new object).
 *
 * Text tokens are pulled toward legibility along their own hue; the SURFACES are
 * never touched, because the surface is the design and moving it would restyle
 * the page rather than fix the text. Two new tokens, `on_accent` and
 * `on_primary`, carry the guaranteed-readable text color for colored
 * backgrounds — the template used to hardcode `var(--surface)` there and simply
 * hope the accent was dark enough.
 */
/**
 * Re-derive the tones that are DEPENDENT on the surface, whenever they sit on
 * the wrong side of it.
 *
 * Needed because the palette is assembled from layers: a reference URL can
 * supply `surface` (e.g. Linear's near-black #08090a) while `surface_soft` and
 * `line` are still the light values inherited from the style seed. Alternating
 * sections would then flash light on a dark site and the hairlines would vanish.
 *
 * A dark surface lightens its dependents, a light surface darkens them, so the
 * relationship is always "slightly separated from the page", never inverted.
 */
export function harmonizeSurfaces(input) {
  const colors = { ...input };
  if (!channels(colors.surface)) return colors;
  const lum = relativeLuminance(colors.surface);
  const isDark = lum < 0.2;
  const shift = (hex, amt) => {
    const hsl = rgbToHsl(hex);
    return withLightness(hex, isDark ? hsl.l + amt : hsl.l - amt);
  };

  // These tones are meant to sit a hair off the page, so the test is "is it
  // still a SUBTLE separation" rather than merely "is it on the right side".
  // Checking side alone let a near-white #f1ece0 band survive on Linear's
  // near-black surface: technically lighter, visually a blown-out stripe.
  // A ratio above ~1.8:1 against the page is no longer subtle, so re-derive.
  const notSubtle = (hex) => {
    if (!channels(hex)) return true;
    const ratio = contrastRatio(hex, colors.surface);
    return ratio === null || ratio > 1.8;
  };
  if (notSubtle(colors.surface_soft)) colors.surface_soft = shift(colors.surface, 0.05);
  if (notSubtle(colors.line)) colors.line = shift(colors.surface, 0.12);
  if (notSubtle(colors.line_soft)) colors.line_soft = shift(colors.surface, 0.07);
  return colors;
}

export function enforcePaletteContrast(input) {
  // Coherence first, legibility second: repairing text against an incoherent
  // set of surfaces would just lock in the wrong backgrounds.
  const colors = harmonizeSurfaces(input);
  const surfaces = [colors.surface, colors.surface_soft].filter(Boolean);

  if (colors.ink && surfaces.length) colors.ink = ensureContrast(colors.ink, surfaces, 4.5);
  if (colors.ink_soft && surfaces.length) colors.ink_soft = ensureContrast(colors.ink_soft, surfaces, 4.5);
  if (colors.mute && surfaces.length) colors.mute = ensureContrast(colors.mute, surfaces, 4.5);

  // Text on the accent, then pull the HOVER shade to keep that same text
  // readable. Constraining one text color to clear both accent and accent_dark
  // up front is unsatisfiable for a mid-tone pair (amber #F59E0B wants dark
  // text, its hover #B45309 wants light text, and nothing clears both), so the
  // text is derived from the accent alone and the hover shade yields to it.
  if (colors.accent) {
    colors.on_accent = onColor(colors.accent);
    if (colors.accent_dark) {
      colors.accent_dark = ensureContrast(colors.accent_dark, [colors.on_accent], 4.5);
    }
  }
  if (colors.primary) {
    colors.on_primary = onColor(colors.primary);
    if (colors.primary_dark) {
      colors.primary_dark = ensureContrast(colors.primary_dark, [colors.on_primary], 4.5);
    }
  }

  return colors;
}

// What the stylesheet used to put on a colored background before on_accent /
// on_primary existed. Only used to MEASURE a pre-enforcement palette: without
// it, auditPalette silently skips those pairs (the token is undefined) and
// cheerfully reports "0 below AA" for a palette whose buttons were unreadable.
const LEGACY_FALLBACKS = {
  on_accent: ["accent_dark", "surface"],
  on_primary: ["surface"],
};

/**
 * Every rendered pair that still falls short. Empty array === AA clean.
 *
 * Pass { legacy: true } to measure a palette that has not been through
 * enforcement yet: missing on_* tokens resolve to what the old CSS hardcoded,
 * so the "before" number reflects what would actually have shipped.
 */
export function auditPalette(colors, { legacy = false } = {}) {
  const out = [];
  for (const pair of RENDERED_PAIRS) {
    let fg = colors[pair.fg];
    if (!fg && legacy) {
      for (const key of LEGACY_FALLBACKS[pair.fg] ?? []) {
        if (colors[key]) { fg = colors[key]; break; }
      }
    }
    const bg = colors[pair.bg];
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio === null || ratio < pair.min) {
      out.push({ ...pair, fgValue: fg, bgValue: bg, ratio: ratio ?? 0 });
    }
  }
  return out;
}

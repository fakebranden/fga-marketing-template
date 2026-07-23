// Token resolution (design engine Increment 2).
//
// Turns an fga-pro-max-skill token SEED (tokens/seeds/<style>.json — a refero-
// style design system with semantically-named colors, display + body type, and
// radii) into the fixed brand-config.json color + font slots the template
// renders. This is what makes two reference styles produce a visibly different
// color + type treatment on the SAME content.
//
// Seeds name their colors per-style (--color-jet-anchor, --color-midnight-void,
// --color-bone-cream, …), each carrying a `role` describing what it is FOR. We
// classify by role keyword + luminance, then assign the template slots with hard
// readability GUARANTEES: the template composition is a light-surface site with
// dark ink and a dark brand band, so we always resolve a light `surface`, a dark
// `ink`, and the style's signature `accent` — even for a dark-first seed like
// linear (we take its lightest tone as paper and its darkest as ink, keeping the
// composition legible while still swapping in the style's exact hues).
//
// Precedence in generate-pages.mjs: template default  <  this seed  <  brand kit.
// So a client's own primary/accent/fonts (from the brand kit) always win where
// present; the seed supplies the style character + fills every slot the kit
// leaves blank. Pure + dependency-free so it is unit-testable.

// ── hex helpers ────────────────────────────────────────────────────────────
function normalizeHex(input) {
  if (typeof input !== "string") return null;
  const h = input.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(h)) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  if (/^[0-9a-f]{6}$/.test(h)) return `#${h}`;
  if (/^[0-9a-f]{8}$/.test(h)) return `#${h.slice(0, 6)}`; // drop alpha
  return null;
}
function rgb(hex) {
  const h = hex.replace(/^#/, "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function hex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
export function luminance(h) {
  const { r, g, b } = rgb(h);
  return 0.299 * r + 0.587 * g + 0.114 * b; // 0..255
}
export function saturation(h) {
  const { r, g, b } = rgb(h);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max; // 0..1
}
export function darken(h, amt) {
  const { r, g, b } = rgb(h); const k = 1 - Math.max(0, Math.min(1, amt));
  return hex(r * k, g * k, b * k);
}
export function lighten(h, amt) {
  const { r, g, b } = rgb(h); const k = Math.max(0, Math.min(1, amt));
  return hex(r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k);
}
function mix(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

// ── font-family parsing ──────────────────────────────────────────────────
// "\"Cardo\", \"Tiempos Headline\", Garamond, serif" → { family:"Cardo",
//   fallback:"\"Tiempos Headline\", Garamond, serif" }
export function parseFontValue(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const family = parts[0].replace(/^["']|["']$/g, "").trim();
  if (!family) return null;
  const rest = parts.slice(1).join(", ").trim();
  const generic = /serif/i.test(value) && !/sans-serif/i.test(value)
    ? 'Georgia, "Times New Roman", serif'
    : 'system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
  return { family, fallback: rest || generic };
}

// ── color classification ───────────────────────────────────────────────────
const ROLE_RULES = [
  ["primarySurface", /primary (light |dark )?surface|page background|canvas|hero base/],
  ["signatureAccent", /signature accent|primary accent|brand-defining/],
  ["secondaryAccent", /secondary accent|gradient terminus|alternate accent|limited-time/],
  ["primaryText", /primary text|headlines/],
  ["secondaryText", /secondary body text|secondary text/],
  ["tertiaryText", /tertiary|muted|disabled|timestamp/],
  ["sectionAlt", /elevated|alternating|secondary section|section background/],
  ["divider", /divider|hairline|separator|\bborder/],
];

function classify(colors) {
  const buckets = {};
  const all = [];
  for (const [name, def] of Object.entries(colors || {})) {
    const value = normalizeHex(def && def.value);
    if (!value) continue;
    const role = String((def && def.role) || "").toLowerCase();
    const entry = { name, value, role, lum: luminance(value), sat: saturation(value) };
    all.push(entry);
    for (const [bucket, re] of ROLE_RULES) {
      if (re.test(role) && !buckets[bucket]) buckets[bucket] = entry;
    }
  }
  return { buckets, all };
}

// Pick the lightest / darkest / most-saturated color as robust fallbacks when a
// role bucket is empty.
const lightest = (all) => all.slice().sort((a, b) => b.lum - a.lum)[0];
const darkest = (all) => all.slice().sort((a, b) => a.lum - b.lum)[0];
const mostColorful = (all) =>
  all.filter((c) => c.sat > 0.12).sort((a, b) => b.sat - a.sat)[0];

// ── main resolver ──────────────────────────────────────────────────────────
// Returns { colors, fonts, radius } in brand-config.json shape, or null if the
// token set has no usable colors.
export function resolveTokens(tokenSet) {
  const t = tokenSet && tokenSet.tokens ? tokenSet.tokens : null;
  if (!t) return null;
  const { buckets, all } = classify(t.colors);
  if (all.length === 0) return null;

  // Paper = a light surface. Prefer the classified primary surface when it is
  // actually light; otherwise the lightest color in the set (handles dark-first
  // seeds where the "primary surface" is near-black).
  const paperCand = buckets.primarySurface && buckets.primarySurface.lum > 170
    ? buckets.primarySurface
    : lightest(all);
  const surface = paperCand.value;

  // Ink = a dark text color. Prefer classified primary text when dark, else the
  // dark primary surface, else the darkest color.
  const inkCand =
    (buckets.primaryText && buckets.primaryText.lum < 120 && buckets.primaryText) ||
    (buckets.primarySurface && buckets.primarySurface.lum < 120 && buckets.primarySurface) ||
    darkest(all);
  const ink = inkCand.value;

  // Accent = the signature brand color; fall back to the most saturated hue,
  // then (last resort) the ink so a CTA is never invisible.
  const accentCand = buckets.signatureAccent || mostColorful(all) || inkCand;
  const accent = accentCand.value;

  // Secondary / tertiary text → muted + soft-ink.
  const secondary = buckets.secondaryText || buckets.tertiaryText;
  const inkSoft = secondary && secondary.lum < 150 ? secondary.value : lighten(ink, 0.32);
  const mute = secondary ? secondary.value : mix(ink, surface, 0.45);

  // Alternating section background — must stay light on this template.
  const surfaceSoft = buckets.sectionAlt && buckets.sectionAlt.lum > 190
    ? buckets.sectionAlt.value
    : darken(surface, 0.035);

  // Divider — a light hairline. Use the seed's divider only if it is light,
  // else derive a subtle tint of the paper.
  const line = buckets.divider && buckets.divider.lum > 195
    ? buckets.divider.value
    : darken(surface, 0.08);

  const colors = {
    primary: ink,               // the dark brand band color
    primary_dark: darken(ink, 0.28),
    primary_soft: lighten(ink, 0.9),
    accent,
    accent_dark: darken(accent, 0.2),
    surface,
    surface_soft: surfaceSoft,
    ink,
    ink_soft: inkSoft,
    mute,
    line,
    line_soft: mix(line, surface, 0.5),
  };

  // Fonts — first display + body entries from the typography block.
  const fonts = {};
  const typo = t.typography || {};
  let displayVal, bodyVal;
  for (const [key, def] of Object.entries(typo)) {
    const v = def && def.value;
    if (!displayVal && /^--font-display/.test(key)) displayVal = v;
    if (!bodyVal && /^--font-body/.test(key)) bodyVal = v;
  }
  const disp = parseFontValue(displayVal);
  const body = parseFontValue(bodyVal);
  if (disp) { fonts.display = disp.family; fonts.display_fallback = disp.fallback; }
  if (body) { fonts.body = body.family; fonts.body_fallback = body.fallback; }

  // Radius — the seed's card radius drives the primary button + card rounding.
  const radii = t.radii || {};
  const radius = radii["--radius-card"] || radii["--radius-tight"] || null;

  return { colors, fonts, radius: radius || undefined };
}

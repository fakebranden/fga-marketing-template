// Inspiration mapping (design engine Increment 3 — URL analysis).
//
// SCOPE CHANGED 2026-07-24 BY OPERATOR DECISION. This module used to enforce
// "anti-mimicry": a reference URL contributed layout/rhythm/motion ONLY, never
// palette or type. In practice that meant an operator pointed the tool at a
// reference site, and the generated lander looked nothing like it — which read
// as the feature being broken. The operator's call: a reference URL should
// "drive the full look" so the result reads as a sibling of the reference.
//
// So inspiration now also supplies PALETTE and TYPE. What is still NOT copied:
// content, copy, imagery, logos, or markup. We extract a design SYSTEM
// (surface/ink/accent + families + rhythm), never assets or text.
//
// Two guarantees keep this safe:
//   1. The brand kit still wins on the client's own identity colours, so a
//      client with real brand colours keeps them (see generate-pages precedence).
//   2. Everything is re-checked by contrast.mjs afterwards, so a reference with
//      poor contrast can never make the generated site fail WCAG AA.
//
// Pure + dependency-free (no browser) so the mapping is unit-testable. The DOM
// measurement that produces `metrics` lives in extract-inspiration.mjs.

// Clamp helper.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const isHex = (v) => typeof v === "string" && /^#?[0-9a-fA-F]{6}$/.test(v.trim());
const norm = (v) => {
  const h = v.trim().replace(/^#/, "").toLowerCase();
  return `#${h}`;
};

// A family only counts as a design signal if it is an actual typeface. Generic
// stacks tell us nothing and must not overwrite the seed's chosen type.
const GENERIC_FAMILIES = new Set([
  "system-ui", "-apple-system", "blinkmacsystemfont", "sans-serif", "serif",
  "monospace", "ui-sans-serif", "ui-serif", "ui-monospace", "inherit", "initial",
  "arial", "helvetica",
]);
const isRealFamily = (v) =>
  typeof v === "string" && v.trim().length > 1 && !GENERIC_FAMILIES.has(v.trim().toLowerCase());

// Raw metrics (from the browser measurement) → a normalized inspiration profile.
//   metrics.sectionPaddingVh   median section vertical padding / viewport height
//   metrics.contentWidthPx     dominant primary-content container width (px)
//   metrics.animatedRatio      fraction of sampled elements with a transition/animation
// Any missing/NaN field falls back to the "balanced" middle so a partial
// measurement never skews the render.
export function layoutToInspiration(metrics) {
  const m = metrics || {};
  const padVh = Number.isFinite(m.sectionPaddingVh) ? m.sectionPaddingVh : 0.12;
  const widthPx = Number.isFinite(m.contentWidthPx) ? m.contentWidthPx : 1100;
  const anim = Number.isFinite(m.animatedRatio) ? m.animatedRatio : 0.08;

  // Vertical rhythm — how much air sits between sections.
  let density, sectionScale;
  if (padVh >= 0.17) { density = "spacious"; sectionScale = 1.25; }
  else if (padVh <= 0.075) { density = "compact"; sectionScale = 0.8; }
  else { density = "balanced"; sectionScale = 1.0; }

  // Content measure — narrow editorial vs wide utilitarian.
  let measure, maxWidthRem;
  if (widthPx <= 820) { measure = "narrow"; maxWidthRem = 64; }
  else if (widthPx >= 1200) { measure = "wide"; maxWidthRem = 96; }
  else { measure = "balanced"; maxWidthRem = 82; }

  // Motion character — stored for the Increment 4 section assembly; not wired to
  // the fixed SOTY motion system yet.
  let motion;
  if (anim >= 0.16) motion = "lively";
  else if (anim <= 0.04) motion = "calm";
  else motion = "balanced";

  // Palette + type lifted from the reference (operator decision 2026-07-24).
  // Only well-formed hex values survive; anything missing simply stays absent so
  // the seed/kit value keeps the slot. A generic/system font family is dropped
  // rather than pinned, since "system-ui" carries no design signal.
  const colors = {};
  if (isHex(m.surfaceHex)) colors.surface = norm(m.surfaceHex);
  if (isHex(m.inkHex)) colors.ink = norm(m.inkHex);
  if (isHex(m.accentHex)) colors.accent = norm(m.accentHex);

  const fonts = {};
  if (isRealFamily(m.displayFamily)) fonts.display = m.displayFamily.trim();
  if (isRealFamily(m.bodyFamily)) fonts.body = m.bodyFamily.trim();

  return {
    density,
    sectionScale: clamp(sectionScale, 0.7, 1.4),
    measure,
    maxWidthRem: clamp(maxWidthRem, 56, 104),
    motion,
    ...(Object.keys(colors).length ? { colors } : {}),
    ...(Object.keys(fonts).length ? { fonts } : {}),
    // Keep the raw signals for traceability / debugging in brand-config.
    _metrics: { sectionPaddingVh: round(padVh, 3), contentWidthPx: Math.round(widthPx), animatedRatio: round(anim, 3) },
  };
}

function round(n, dp) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

// Inspiration profile → the ONLY CSS vars the template consumes from a URL.
// Deliberately just layout: a section-padding scale and the content max-width.
// No color, no font — enforced by having nothing else to return.
export function inspirationToLayoutVars(inspiration) {
  const out = {};
  if (!inspiration || typeof inspiration !== "object") return out;
  if (Number.isFinite(inspiration.sectionScale)) {
    out["--section-scale"] = String(inspiration.sectionScale);
  }
  if (Number.isFinite(inspiration.maxWidthRem)) {
    out["--maxw"] = `${inspiration.maxWidthRem}rem`;
  }
  return out;
}

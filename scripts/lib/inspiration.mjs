// Inspiration mapping (design engine Increment 3 — URL analysis).
//
// ANTI-MIMICRY IS THE WHOLE POINT (spec §7 I2 + §1.10 precedence): an analyzed
// reference URL contributes LAYOUT / RHYTHM / MOTION character ONLY — NEVER
// palette or type. Inspiration supplies STRUCTURE; the brand kit supplies
// IDENTITY. That split is what stops every generated site looking like the site
// it was told to mimic. This module therefore deals exclusively in spacing
// rhythm, content measure, and motion intensity. There is no color or font in
// here by construction, and generate-pages only ever applies `--section-scale`
// and `--maxw` from it — the palette/type slots are untouched.
//
// Pure + dependency-free (no browser) so the mapping is unit-testable. The DOM
// measurement that produces `metrics` lives in extract-inspiration.mjs.

// Clamp helper.
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

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

  return {
    density,
    sectionScale: clamp(sectionScale, 0.7, 1.4),
    measure,
    maxWidthRem: clamp(maxWidthRem, 56, 104),
    motion,
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

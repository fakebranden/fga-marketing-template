// Pure helpers for the rendered-text legibility check.
//
// WHY THIS EXISTS: contrast.mjs enforces WCAG on the palette's SOLID TOKEN PAIRS
// (ink on surface, on-accent on accent, ...). That is necessary but not
// sufficient: it cannot see a headline laid over a WebGL object, a photo, or a
// gradient, because the background there is not a token, it is whatever pixels
// happened to render. The franchi-law hero shipped at 1.0:1 for exactly that
// reason. This module holds the decision logic for a check that samples the
// ACTUAL composited pixels behind each line of text.
//
// The browser-side sampling lives in ../check-text-legibility.mjs; everything
// judgeable without a DOM lives here so it can be unit tested.

import { contrastRatio } from "./contrast.mjs";

// WCAG 2.x "large text": >=24px, or >=18.66px when bold (>=700). Large text is
// held to 3:1, everything else to 4.5:1.
export function wcagThreshold({ fontSizePx, fontWeight }) {
  const size = Number(fontSizePx) || 0;
  const weight = Number(fontWeight) || 400;
  const large = size >= 24 || (size >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}

export function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return null;
  const c = (n) => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, "0");
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
}

// Parse a computed CSS colour ("rgb(31, 58, 46)" / "rgba(31,58,46,0.9)") to hex.
// Returns null for anything without three numeric channels.
export function cssColorToHex(css) {
  if (typeof css !== "string") return null;
  const nums = css.match(/[\d.]+/g);
  if (!nums || nums.length < 3) return null;
  return rgbToHex(nums.slice(0, 3).map(Number));
}

// Given a text colour and the background pixels sampled behind it, decide.
// `samples` is an array of [r,g,b].
//
// The verdict is AREA-based, not single-worst-pixel. A rect always picks up a
// few pixels of whatever the text sits next to — the shoulder of a gradient, the
// edge of a button, one wireframe line — and failing a build on one stray pixel
// makes the check noise, which means it gets ignored. What actually makes text
// unreadable is a MEANINGFUL SHARE of it being low contrast. For scale: the
// franchi-law hero defect this was written for ran 63-79% of pixels below
// threshold, while a legitimate line that merely clips a gradient edge sits
// near 0.1%. `tolerancePct` (default 3%) sits comfortably between the two.
export function judgeSamples({ colorHex, samples, threshold, tolerancePct = 3 }) {
  if (!colorHex || !samples || samples.length === 0) {
    return { pass: true, skipped: true, worst: null, worstPx: null, pctBelow: 0, sampleCount: 0 };
  }
  let worst = Infinity;
  let worstPx = null;
  let below = 0;
  let counted = 0;
  for (const px of samples) {
    const hex = rgbToHex(px);
    const ratio = contrastRatio(colorHex, hex);
    if (ratio === null) continue;
    counted++;
    if (ratio < threshold) below++;
    if (ratio < worst) {
      worst = ratio;
      worstPx = px;
    }
  }
  if (counted === 0) {
    return { pass: true, skipped: true, worst: null, worstPx: null, pctBelow: 0, sampleCount: 0 };
  }
  const pctBelow = (100 * below) / counted;
  return {
    pass: pctBelow < tolerancePct,
    skipped: false,
    worst: Math.round(worst * 100) / 100,
    worstPx,
    pctBelow: Math.round(pctBelow * 10) / 10,
    sampleCount: counted,
  };
}

// The hero object floats and rotates, so a single frame only proves that ONE
// frame was readable. Callers sample several frames; this keeps the worst
// verdict per line so a transient collision cannot pass. "Worst" is by affected
// AREA, matching how judgeSamples decides, with the lower absolute contrast
// breaking ties.
export function mergeFrameVerdicts(verdicts) {
  const real = (verdicts || []).filter((v) => v && !v.skipped);
  if (real.length === 0) return { pass: true, skipped: true, worst: null, worstPx: null, pctBelow: 0, sampleCount: 0 };
  return real.reduce((acc, v) => {
    if (v.pctBelow > acc.pctBelow) return v;
    if (v.pctBelow === acc.pctBelow && v.worst < acc.worst) return v;
    return acc;
  });
}

// Fraction of `inner`'s area that falls outside `outer`. Used to catch text that
// has grown out of the section that is supposed to contain it — the failure mode
// where a long generated headline overflows the top of the hero and lands on the
// nav. 0 = fully contained.
export function overflowFraction(inner, outer, tolerancePx = 2) {
  const ix0 = Math.max(inner.x, outer.x - tolerancePx);
  const iy0 = Math.max(inner.y, outer.y - tolerancePx);
  const ix1 = Math.min(inner.x + inner.w, outer.x + outer.w + tolerancePx);
  const iy1 = Math.min(inner.y + inner.h, outer.y + outer.h + tolerancePx);
  const overlap = Math.max(0, ix1 - ix0) * Math.max(0, iy1 - iy0);
  const area = Math.max(1, inner.w * inner.h);
  return Math.max(0, Math.min(1, 1 - overlap / area));
}

// Fraction of the SMALLER rect covered by the other. Two text runs from
// different elements sharing space is a collision, not a design.
export function intersectionOverSmaller(a, b) {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const overlap = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const smaller = Math.max(1, Math.min(a.w * a.h, b.w * b.h));
  return overlap / smaller;
}

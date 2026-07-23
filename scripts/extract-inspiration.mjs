#!/usr/bin/env node
/**
 * extract-inspiration.mjs — LAYOUT / MOTION inspiration extractor (Increment 3).
 *
 * ANTI-MIMICRY (spec §7 I2 + §1.10): this reads a reference URL and measures its
 * STRUCTURE ONLY — section spacing rhythm, content measure, motion intensity.
 * It NEVER reads colors or fonts. That is deliberate and load-bearing: it is
 * what stops every generated site looking like the site it was told to mimic.
 * (The older extract-tokens.mjs pulls palette + type; its output is NOT wired
 * into the render — see the design-engine plan.)
 *
 * Exposes `extractInspiration(url)` for generate-pages to call inline, plus a
 * CLI for standalone runs. Fully fail-safe: any failure (no browser binary,
 * navigation timeout, bot wall) returns null so inspiration is skipped and the
 * build proceeds on the seed + brand-kit tokens alone.
 *
 * Usage (standalone): node scripts/extract-inspiration.mjs --url https://apple.com
 */
import { writeFileSync } from "node:fs";
import { layoutToInspiration } from "./lib/inspiration.mjs";

// Browser-side measurement — passed as a real function to page.evaluate (runs
// in the page, not in Node). Pure geometry + motion; ZERO color/font reads.
/* eslint-disable */
function measureInPage() {
  const median = (arr) => {
    const a = arr.filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => x - y);
    if (!a.length) return NaN;
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  };
  const vh = window.innerHeight || 900;
  const vw = window.innerWidth || 1440;

  // 1. Section vertical rhythm — the "air" between major blocks. Section spacing
  // lives in different places on different sites (padding on the <section>,
  // padding on an inner wrapper, or margins/gaps between blocks), so we take the
  // strongest of three signals: the block's own vertical padding+margin, and the
  // gap to the next block. The median across boundaries is the rhythm metric.
  let sections = Array.from(document.querySelectorAll("section"));
  if (sections.length < 2) {
    const main = document.querySelector("main") || document.body;
    sections = Array.from(main.children).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width >= vw * 0.55 && r.height >= 160;
    });
  }
  const sy = window.scrollY || 0;
  const boxes = sections
    .map((el) => {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        top: r.top + sy,
        bottom: r.bottom + sy,
        pad: (parseFloat(s.paddingTop) || 0) + (parseFloat(s.paddingBottom) || 0),
        mar: (parseFloat(s.marginTop) || 0) + (parseFloat(s.marginBottom) || 0),
      };
    })
    .sort((a, b) => a.top - b.top);
  const air = [];
  for (let i = 0; i < boxes.length; i++) {
    const gap = i + 1 < boxes.length ? Math.max(0, boxes[i + 1].top - boxes[i].bottom) : 0;
    // whitespace attributable to this boundary: own padding+margin plus the gap
    air.push(boxes[i].pad + boxes[i].mar + gap);
  }
  const sectionPaddingPx = median(air);
  const sectionPaddingVh = Number.isFinite(sectionPaddingPx) ? sectionPaddingPx / vh : NaN;

  // 2. Content measure — median rendered width of real text paragraphs.
  const paras = Array.from(document.querySelectorAll("p"))
    .filter((p) => (p.textContent || "").trim().length > 40)
    .map((p) => p.getBoundingClientRect().width)
    .filter((w) => w > 120 && w < vw * 0.99);
  const contentWidthPx = median(paras);

  // 3. Motion intensity — fraction of sampled elements with a transition/anim.
  const all = document.querySelectorAll("body *");
  const n = Math.min(all.length, 600);
  let animated = 0;
  for (let i = 0; i < n; i++) {
    const s = getComputedStyle(all[i]);
    const td = s.transitionDuration || "0s";
    const an = s.animationName || "none";
    if ((td !== "0s" && td !== "") || (an && an !== "none")) animated++;
  }
  const animatedRatio = n ? animated / n : 0;

  return {
    sectionPaddingVh,
    contentWidthPx: Number.isFinite(contentWidthPx) ? contentWidthPx : NaN,
    animatedRatio,
    _sampleSections: sections.length,
    _sampleParas: paras.length,
  };
}
/* eslint-enable */

export async function extractInspiration(url) {
  if (!url) return null;
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.warn("[inspiration] playwright not available — skipping URL analysis");
    return null;
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
    });
    const page = await ctx.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    const metrics = await page.evaluate(measureInPage);
    const inspiration = layoutToInspiration(metrics);
    inspiration.source = url;
    return inspiration;
  } catch (e) {
    console.warn(`[inspiration] extraction failed for ${url}: ${e.message} — skipping`);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const idx = process.argv.indexOf("--url");
  const url = idx >= 0 ? process.argv[idx + 1] : null;
  const outIdx = process.argv.indexOf("--out");
  const out = outIdx >= 0 ? process.argv[outIdx + 1] : null;
  if (!url) {
    console.error("Usage: node scripts/extract-inspiration.mjs --url <url> [--out <path>]");
    process.exit(2);
  }
  const insp = await extractInspiration(url);
  if (!insp) {
    console.error("no inspiration extracted");
    process.exit(1);
  }
  const json = JSON.stringify(insp, null, 2);
  if (out) writeFileSync(out, json + "\n");
  console.log(json);
}

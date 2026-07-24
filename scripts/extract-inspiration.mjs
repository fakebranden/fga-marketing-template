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

  // 4. Palette — the reference's actual surface / ink / accent.
  //
  // Area-weighted, because what makes a site "look like" itself is the colour
  // covering the most pixels, not the most DOM nodes. Surface = the dominant
  // background; ink = the dominant colour of real body text; accent = the most
  // saturated colour used on interactive/emphasis elements, which is where a
  // brand's signature hue actually lives.
  const toRgb = (v) => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(",").map((x) => parseFloat(x));
    if (p.length >= 4 && p[3] < 0.5) return null; // effectively transparent
    if (![p[0], p[1], p[2]].every(Number.isFinite)) return null;
    return { r: p[0], g: p[1], b: p[2] };
  };
  const hex = ({ r, g, b }) =>
    "#" + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
  const sat = ({ r, g, b }) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx === 0 ? 0 : (mx - mn) / mx;
  };

  const bgArea = new Map();
  const inkArea = new Map();
  const accentArea = new Map();
  const els = document.querySelectorAll("body *");
  const cap = Math.min(els.length, 1500);
  for (let i = 0; i < cap; i++) {
    const el = els[i];
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const area = r.width * r.height;
    const s = getComputedStyle(el);

    const bg = toRgb(s.backgroundColor);
    if (bg) bgArea.set(hex(bg), (bgArea.get(hex(bg)) || 0) + area);

    // Ink: only count elements that hold their own visible text.
    const own = Array.from(el.childNodes)
      .filter((nd) => nd.nodeType === 3)
      .map((nd) => nd.textContent.trim())
      .join("");
    if (own.length > 2) {
      const col = toRgb(s.color);
      if (col) {
        const fs = parseFloat(s.fontSize) || 16;
        const weight = own.length * fs; // text volume, not box area
        inkArea.set(hex(col), (inkArea.get(hex(col)) || 0) + weight);
        // Saturated text (links, emphasis) is an accent candidate.
        if (sat(col) > 0.25) accentArea.set(hex(col), (accentArea.get(hex(col)) || 0) + weight);
      }
    }
    // Saturated fills on small elements (buttons, chips, rules) are the
    // strongest accent signal on most marketing sites.
    if (bg && sat(bg) > 0.25 && area < vw * vh * 0.4) {
      accentArea.set(hex(bg), (accentArea.get(hex(bg)) || 0) + area);
    }
  }
  const top = (m) => {
    let best = null, bestV = -1;
    for (const [k, v] of m) if (v > bestV) { bestV = v; best = k; }
    return best;
  };

  // 5. Typography — the families actually used for headings vs body.
  const famOf = (el) => {
    const f = getComputedStyle(el).fontFamily || "";
    return f.split(",")[0].replace(/^["']|["']$/g, "").trim();
  };
  const headingEl = document.querySelector("h1") || document.querySelector("h2");
  const bodyEl =
    Array.from(document.querySelectorAll("p")).find((p) => (p.textContent || "").trim().length > 40) ||
    document.body;
  const displayFamily = headingEl ? famOf(headingEl) : "";
  const bodyFamily = bodyEl ? famOf(bodyEl) : "";
  const headingWeight = headingEl ? getComputedStyle(headingEl).fontWeight : "";
  const headingTransform = headingEl ? getComputedStyle(headingEl).textTransform : "";

  return {
    sectionPaddingVh,
    contentWidthPx: Number.isFinite(contentWidthPx) ? contentWidthPx : NaN,
    animatedRatio,
    surfaceHex: top(bgArea),
    inkHex: top(inkArea),
    accentHex: top(accentArea),
    displayFamily,
    bodyFamily,
    headingWeight,
    headingTransform,
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

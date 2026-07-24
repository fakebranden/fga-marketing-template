#!/usr/bin/env node
// Rendered-text legibility check.
//
// Renders the site in a real Chromium and asks the question the palette-level
// contrast gate cannot: is every line of text actually readable against the
// pixels that ended up behind it? Text over a WebGL object, a photo, a gradient
// or a mask has no "background token" to check, so the only honest answer comes
// from sampling the composited frame.
//
// Method, per viewport and per scroll step:
//   1. Collect every visible text line's rect, colour, size and weight
//      (per-line via Range.getClientRects, so a wrapped headline is judged
//      line by line rather than as one loose bounding box).
//   2. Re-render with glyphs made transparent. Every box, background, image and
//      canvas stays exactly where it was; only the letterforms go. Screenshot
//      that: it is literally "what is behind the text".
//   3. Sample the background inside each line's rect and take the WORST contrast.
//   4. Repeat over several animation frames, because the hero object drifts.
//
// It also flags two structural failures the pixel check cannot see, both of
// which shipped at some point: text overflowing the section meant to contain it,
// and two text runs colliding in the same space.
//
// Usage:
//   node scripts/check-text-legibility.mjs [url] [--viewports 1440x900,390x844]
//                                          [--frames 3] [--json report.json]
//                                          [--screenshot-dir dir] [--quiet]
// Exits 1 if any check fails. Skips cleanly (exit 0) if Playwright's Chromium
// is unavailable, so it can sit in a build without becoming a hard dependency.

import { writeFileSync, mkdirSync } from "node:fs";
import {
  wcagThreshold, cssColorToHex, judgeSamples, mergeFrameVerdicts,
  overflowFraction, intersectionOverSmaller,
} from "./lib/legibility.mjs";

const argv = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const has = (name) => argv.includes(`--${name}`);

const url = argv.find((a) => !a.startsWith("--") && (a.startsWith("http") || a.startsWith("file:"))) || "http://localhost:3000";
const viewports = flag("viewports", "1440x900,390x844").split(",").map((v) => {
  const [w, h] = v.split("x").map(Number);
  return { width: w, height: h };
});
const frames = Math.max(1, Number(flag("frames", 3)));
const jsonOut = flag("json", null);
const shotDir = flag("screenshot-dir", null);
const quiet = has("quiet");
const log = (...a) => { if (!quiet) console.log(...a); };

// Glyphs off, everything else untouched. -webkit-text-fill-color is what actually
// wins for text painted through a fill, and text-shadow would otherwise survive
// and re-draw the letterform we are trying to remove.
const HIDE_GLYPHS = `*, *::before, *::after {
  color: transparent !important;
  -webkit-text-fill-color: transparent !important;
  text-shadow: none !important;
  text-decoration-color: transparent !important;
  caret-color: transparent !important;
  /* background-clip:text paints the element's BACKGROUND in the shape of the
     glyphs. Making the fill transparent does not remove that, so without this
     the letterforms survive into the "background" screenshot and the check
     measures the text against itself. */
  background-image: none !important;
}`;

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("[legibility] playwright not installed — skipping (not a failure)");
  process.exit(0);
}

let browser;
try {
  browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
} catch (err) {
  console.log(`[legibility] could not launch Chromium — skipping (not a failure): ${err.message.split("\n")[0]}`);
  process.exit(0);
}

// ---------------------------------------------------------------- page probes

// Every visible text line, with what it needs to be judged. Runs with glyphs
// VISIBLE, so rects are the real painted positions.
const COLLECT = () => {
  const out = [];

  // Floating, fixed-position furniture (chat bubble, sticky header, cookie bar)
  // sits ON TOP of page content by design. Pixels under it are not a contrast
  // property of the text beneath, so they are excluded from sampling rather
  // than counted as unreadable.
  const occluders = [];
  for (const el of document.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.position !== "fixed" && cs.position !== "sticky") continue;
    if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.15) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    if (r.width > innerWidth * 0.98 && r.height > innerHeight * 0.98) continue; // full-page wrappers
    occluders.push({ x: r.x, y: r.y, w: r.width, h: r.height });
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    const text = n.textContent.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const el = n.parentElement;
    if (!el || el.closest("script, style, noscript, svg")) continue;
    // Explicit, reviewable opt-out for text that is genuinely decoration
    // (separator glyphs and the like), which WCAG 1.4.3 exempts.
    if (el.closest("[data-legibility-ignore]")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (parseFloat(cs.opacity) < 0.15) continue;

    // Screen-reader-only text. Range.getClientRects() reports a text node's
    // LAYOUT box and does not clip it to an ancestor's overflow, so the hidden
    // full-text copy that split-reveal components keep for accessibility
    // measures at its full unwrapped width — which then looks like a 2400px
    // line overflowing its section. Judge the element's own painted box instead.
    const own = el.getBoundingClientRect();
    if (own.width < 4 || own.height < 4) continue;
    if (cs.clipPath === "inset(50%)" || (cs.clip && cs.clip !== "auto")) continue;
    // an ancestor may be the one that is faded out / hidden
    let anc = el, hidden = false;
    while (anc && anc !== document.body) {
      const acs = getComputedStyle(anc);
      if (acs.visibility === "hidden" || acs.display === "none" || parseFloat(acs.opacity) < 0.15) { hidden = true; break; }
      anc = anc.parentElement;
    }
    if (hidden) continue;

    // Is this line being moved by an animation? Scroll-driven parallax, GSAP
    // pinning and reveal transforms all legitimately translate text outside the
    // box that owns it, so structural checks must not judge those. Contrast
    // still applies — a transformed line still has to be readable.
    let transformed = false;
    for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
      const t = getComputedStyle(a).transform;
      if (t && t !== "none") { transformed = true; break; }
    }

    const section = el.closest("section, header, footer, main") || document.body;
    const sr = section.getBoundingClientRect();
    const r = document.createRange();
    r.selectNodeContents(n);
    for (const rect of r.getClientRects()) {
      if (rect.width < 6 || rect.height < 6) continue;
      // only what is actually on screen right now
      if (rect.bottom <= 0 || rect.top >= innerHeight) continue;
      if (rect.right <= 0 || rect.left >= innerWidth) continue;

      // ...and only what is actually ON TOP. The curtain-reveal footer is
      // position:fixed behind the whole page, so its text is "visible" by every
      // style test at every scroll position while being completely covered by
      // the content above it. Sampling there reads the covering content and
      // reports contrast for text nobody can see. Probe a few points across the
      // line and require the text's own element to be the hit at one of them.
      const probes = [0.2, 0.5, 0.8].map((t) => [rect.left + rect.width * t, rect.top + rect.height / 2]);
      const onTop = probes.some(([px, py]) => {
        if (px < 0 || py < 0 || px >= innerWidth || py >= innerHeight) return false;
        const hit = document.elementFromPoint(px, py);
        return hit && (hit === el || hit.contains(el) || el.contains(hit));
      });
      if (!onTop) continue;

      out.push({
        text: text.slice(0, 70),
        tag: el.tagName,
        color: cs.color,
        fontSizePx: parseFloat(cs.fontSize),
        fontWeight: cs.fontWeight,
        transformed,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        section: { tag: section.tagName, id: section.id || null, x: sr.x, y: sr.y, w: sr.width, h: sr.height },
      });
    }
  }
  return { lines: out, occluders };
};

// Decode the background screenshot with the browser's own PNG decoder and return
// the sampled pixels behind each rect. Sampling on a stride keeps a full-page
// run to a sane number of reads while still catching thin dark features.
const SAMPLE = async ({ b64, lines, dpr, occluders }) => {
  const img = new Image();
  img.src = "data:image/png;base64," + b64;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  return lines.map((L) => {
    const x0 = Math.max(0, Math.floor(L.rect.x * dpr));
    const y0 = Math.max(0, Math.floor(L.rect.y * dpr));
    const x1 = Math.min(c.width, Math.ceil((L.rect.x + L.rect.w) * dpr));
    const y1 = Math.min(c.height, Math.ceil((L.rect.y + L.rect.h) * dpr));
    if (x1 <= x0 || y1 <= y0) return [];
    const w = x1 - x0, h = y1 - y0;
    const d = ctx.getImageData(x0, y0, w, h).data;
    const stride = Math.max(1, Math.floor(Math.sqrt((w * h) / 2200)));
    const covered = (px, py) => (occluders || []).some((o) =>
      px >= o.x - 1 && px <= o.x + o.w + 1 && py >= o.y - 1 && py <= o.y + o.h + 1);
    const px = [];
    for (let y = 0; y < h; y += stride) {
      for (let x = 0; x < w; x += stride) {
        // back to CSS pixels to test against the occluder rects
        if (covered((x0 + x) / dpr, (y0 + y) / dpr)) continue;
        const i = (y * w + x) * 4;
        px.push([d[i], d[i + 1], d[i + 2]]);
      }
    }
    return px;
  });
};

// ------------------------------------------------------------------ the check

const failures = [];
const report = { url, viewports: [], checkedLines: 0, generatedAt: null };

for (const viewport of viewports) {
  const label = `${viewport.width}x${viewport.height}`;
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const vpReport = { viewport: label, steps: [], failures: 0 };
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
    // let intro choreography, fonts and the R3F scene settle
    await page.waitForTimeout(9000);
    await page.evaluate(() => document.fonts?.ready);

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    const steps = Math.max(1, Math.ceil(pageHeight / viewport.height));
    log(`\n[legibility] ${label} — ${pageHeight}px tall, ${steps} scroll step(s)`);

    for (let step = 0; step < steps; step++) {
      const y = step * viewport.height;
      await page.evaluate((top) => window.scrollTo({ top, behavior: "auto" }), y);
      await page.waitForTimeout(1200); // smooth-scroll + ScrollTrigger settle

      const { lines, occluders } = await page.evaluate(COLLECT);
      if (lines.length === 0) continue;

      // --- structural checks -----------------------------------------------
      // Only meaningful on untransformed text: scroll-driven parallax, GSAP pins
      // and reveal transforms move text out of its own section by design, and
      // judging those produces pure noise. This is exactly where a headline that
      // has outgrown its hero shows up.
      const still = lines.filter((L) => !L.transformed);
      for (const L of still) {
        const over = overflowFraction(L.rect, L.section);
        if (over > 0.12) {
          failures.push({
            kind: "overflow", viewport: label, scrollY: y, text: L.text, tag: L.tag,
            detail: `${Math.round(over * 100)}% of the line falls outside its <${L.section.tag.toLowerCase()}>`,
          });
        }
        if (L.rect.x < -2 || L.rect.x + L.rect.w > viewport.width + 2) {
          failures.push({
            kind: "horizontal-overflow", viewport: label, scrollY: y, text: L.text, tag: L.tag,
            detail: `line spans x ${Math.round(L.rect.x)}..${Math.round(L.rect.x + L.rect.w)} in a ${viewport.width}px viewport`,
          });
        }
      }
      for (let i = 0; i < still.length; i++) {
        for (let j = i + 1; j < still.length; j++) {
          if (still[i].text === still[j].text) continue; // marquees repeat by design
          const cover = intersectionOverSmaller(still[i].rect, still[j].rect);
          if (cover > 0.6) {
            failures.push({
              kind: "text-collision", viewport: label, scrollY: y,
              text: `${still[i].text} / ${still[j].text}`, tag: `${still[i].tag}/${still[j].tag}`,
              detail: `${Math.round(cover * 100)}% of the smaller line is covered by the other`,
            });
          }
        }
      }

      // --- pixel contrast, worst case over N frames -------------------------
      const perLine = lines.map(() => []);
      const style = await page.addStyleTag({ content: HIDE_GLYPHS });
      for (let f = 0; f < frames; f++) {
        await page.waitForTimeout(f === 0 ? 250 : 420);
        const shot = await page.screenshot();
        if (shotDir && f === 0) {
          mkdirSync(shotDir, { recursive: true });
          writeFileSync(`${shotDir}/bg-${label}-y${y}.png`, shot);
        }
        const sampled = await page.evaluate(SAMPLE, { b64: shot.toString("base64"), lines, dpr: 1, occluders });
        lines.forEach((L, idx) => {
          perLine[idx].push(judgeSamples({
            colorHex: cssColorToHex(L.color),
            samples: sampled[idx],
            threshold: wcagThreshold(L),
          }));
        });
      }
      await style.evaluate((el) => el.remove());

      lines.forEach((L, idx) => {
        const need = wcagThreshold(L);
        const v = mergeFrameVerdicts(perLine[idx]);
        report.checkedLines++;
        if (!v.skipped && !v.pass) {
          failures.push({
            kind: "contrast", viewport: label, scrollY: y, text: L.text, tag: L.tag,
            detail: `${v.worst}:1 against the rendered background, needs ${need}:1 ` +
                    `(${v.pctBelow}% of sampled pixels below; worst pixel rgb(${v.worstPx}); text ${L.color}; ${L.fontSizePx}px)`,
          });
        }
      });
      vpReport.steps.push({ scrollY: y, lines: lines.length });
    }
  } finally {
    await page.close();
  }
  vpReport.failures = failures.filter((f) => f.viewport === label).length;
  report.viewports.push(vpReport);
}

await browser.close();

// ------------------------------------------------------------------- reporting

report.failures = failures;
report.pass = failures.length === 0;
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));

if (failures.length === 0) {
  log(`\n[legibility] PASS — ${report.checkedLines} text lines checked across ${viewports.length} viewport(s), all readable and contained.`);
  process.exit(0);
}

console.error(`\n[legibility] FAIL — ${failures.length} problem(s) across ${report.checkedLines} checked lines:\n`);
const byKind = {};
for (const f of failures) (byKind[f.kind] ||= []).push(f);
for (const [kind, list] of Object.entries(byKind)) {
  console.error(`  ${kind} (${list.length}):`);
  for (const f of list.slice(0, 12)) {
    console.error(`    [${f.viewport} @y${f.scrollY}] <${f.tag.toLowerCase()}> "${f.text}"`);
    console.error(`        ${f.detail}`);
  }
  if (list.length > 12) console.error(`    ... and ${list.length - 12} more`);
}
process.exit(1);

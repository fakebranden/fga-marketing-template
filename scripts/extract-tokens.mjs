#!/usr/bin/env node
/**
 * extract-tokens.mjs — Playwright-driven token extractor
 *
 * Reads a URL, scrapes its computed-style design vocabulary (CSS custom
 * properties, key paint colors, fonts), and emits a token JSON that
 * conforms to tokens/tokens.schema.json with extractionMethod set to
 * "playwright-scrape".
 *
 * Output is written to tokens/seeds/_cache/<slug>.json by default
 * (override with --out <path>). The slug is derived from the URL host
 * with `.`, `-`, and `_` collapsed to `-`.
 *
 * Naming convention: HSL bucketing → adjective-noun pair.
 * See tokens/README.md → "Token naming dictionary" for the canonical map.
 *
 * Usage:
 *   node scripts/extract-tokens.mjs --url https://stripe.com
 *   node scripts/extract-tokens.mjs --url https://x.com --out tokens/seeds/_cache/x.json
 *
 * Dependency: `playwright` (peer). If not installed, the script exits
 * with a friendly install instruction (no crash, no stack trace).
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── CLI args ─────────────────────────────────────────────────────────
function parseArgs() {
  const args = { url: null, out: null };
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === "--url") args.url = process.argv[++i];
    else if (a === "--out") args.out = process.argv[++i];
    else if (a === "-h" || a === "--help") {
      console.log(
        "Usage: node scripts/extract-tokens.mjs --url <url> [--out <path>]"
      );
      process.exit(0);
    }
  }
  return args;
}

function slugFromUrl(u) {
  try {
    const host = new URL(u).hostname.replace(/^www\./, "");
    return host.replace(/[._]/g, "-");
  } catch {
    return "unknown";
  }
}

// ─── HSL bucketing ────────────────────────────────────────────────────
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function parseCssColor(s) {
  if (!s) return null;
  s = s.trim().toLowerCase();
  if (s === "transparent" || s === "none") return null;
  let m = s.match(/^#([0-9a-f]{3})$/i);
  if (m) {
    const [r, g, b] = m[1].split("").map((c) => parseInt(c + c, 16));
    return { r, g, b };
  }
  m = s.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    return {
      r: parseInt(m[1].slice(0, 2), 16),
      g: parseInt(m[1].slice(2, 4), 16),
      b: parseInt(m[1].slice(4, 6), 16),
    };
  }
  m = s.match(/^rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/);
  if (m) {
    return { r: +m[1], g: +m[2], b: +m[3] };
  }
  return null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s, l };
}

const HUE_NAMES = [
  // [hueDegree, name]
  [0, "blaze"],     // red
  [25, "amber"],    // orange
  [55, "canary"],   // yellow
  [105, "clover"],  // green
  [165, "lagoon"],  // cyan
  [215, "cobalt"],  // blue
  [255, "indigo"],
  [285, "violet"],
  [325, "fuchsia"],
  [360, "blaze"],
];

function hueName(h) {
  // pick closest bucket
  let best = HUE_NAMES[0];
  let bestDist = 999;
  for (const entry of HUE_NAMES) {
    const d = Math.min(Math.abs(entry[0] - h), 360 - Math.abs(entry[0] - h));
    if (d < bestDist) { bestDist = d; best = entry; }
  }
  return best[1];
}

function nameColor(rgb, usedNames = new Set()) {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  let base;
  // very light + low sat → paper/cloud/slate-dust
  if (l >= 0.95 && s <= 0.05) {
    base = ["paper-base", "cloud-whisper", "slate-dust"].find((n) => !usedNames.has(n)) || "paper-extra";
  }
  // very dark → jet/midnight/obsidian
  else if (l <= 0.10) {
    base = ["jet-anchor", "midnight-void", "obsidian-deep"].find((n) => !usedNames.has(n)) || "jet-extra";
  }
  // mid-dark + saturated → <hue>-anchor
  else if (l > 0.10 && l < 0.40 && s >= 0.30) {
    base = `${hueName(h)}-anchor`;
  }
  // bright + saturated → <hue>-spark (signature accent)
  else if (l > 0.50 && s > 0.50) {
    base = `${hueName(h)}-spark`;
  }
  // mid + low sat → graphite-body etc.
  else if (l > 0.40 && l < 0.60 && s < 0.30) {
    base = ["graphite-body", "slate-body", "ash-body"].find((n) => !usedNames.has(n)) || "graphite-extra";
  }
  // light + medium sat → muted accent
  else if (l >= 0.60 && s >= 0.20) {
    base = `${hueName(h)}-muted`;
  }
  // fallback
  else {
    base = `${hueName(h)}-${l < 0.5 ? "anchor" : "muted"}`;
  }
  // dedupe
  let key = `--color-${base}`;
  let i = 2;
  while (usedNames.has(key)) {
    key = `--color-${base}-${i++}`;
  }
  usedNames.add(key);
  return key;
}

function inferRole(rgb) {
  const { l, s } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (l >= 0.95) return "Primary light surface — page background, card fills";
  if (l <= 0.10) return "Primary dark surface — hero anchors, dark sections";
  if (l < 0.40 && s >= 0.30) return "Primary text or dark accent surface";
  if (l > 0.50 && s > 0.50) return "Signature accent — CTAs, highlights, key links";
  if (l > 0.40 && l < 0.60 && s < 0.30) return "Body text or muted secondary surface";
  return "Supporting tone — borders, secondary surfaces";
}

function inferContext(rgb) {
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  if (l >= 0.95) return "high-light neutral";
  if (l <= 0.10) return "deep-dark anchor";
  if (s < 0.10) return `neutral grey, l=${l.toFixed(2)}`;
  return `${hueName(h)} family, l=${l.toFixed(2)} s=${s.toFixed(2)}`;
}

// ─── Browser-side extractor (runs inside Playwright page.evaluate) ────
const browserScript = `
() => {
  const out = {
    customProps: {},
    body: {},
    paint: {},
    fonts: [],
  };

  // 1. Custom properties on :root
  const rootStyle = getComputedStyle(document.documentElement);
  for (let i = 0; i < rootStyle.length; i++) {
    const name = rootStyle[i];
    if (name.startsWith("--")) {
      out.customProps[name] = rootStyle.getPropertyValue(name).trim();
    }
  }

  // 2. body computed
  const bodyStyle = getComputedStyle(document.body);
  out.body = {
    background: bodyStyle.backgroundColor,
    color: bodyStyle.color,
    fontFamily: bodyStyle.fontFamily,
    fontSize: bodyStyle.fontSize,
  };

  // 3. paint sweep — top color frequencies over first 500 visible elements
  const counts = new Map();
  const fonts = new Set();
  const all = document.querySelectorAll("*");
  const limit = Math.min(all.length, 500);
  for (let i = 0; i < limit; i++) {
    const el = all[i];
    const s = getComputedStyle(el);
    for (const prop of ["color", "backgroundColor", "borderTopColor"]) {
      const v = s[prop];
      if (!v || v === "rgba(0, 0, 0, 0)" || v === "transparent") continue;
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    if (s.fontFamily) fonts.add(s.fontFamily);
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  out.paint.topColors = sorted.slice(0, 8).map(([color, count]) => ({ color, count }));

  // 4. Headline + button samples
  const h1 = document.querySelector("h1");
  if (h1) {
    const s = getComputedStyle(h1);
    out.paint.h1 = {
      color: s.color,
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      fontWeight: s.fontWeight,
    };
  }
  const btn = document.querySelector("button, a[role='button'], .btn");
  if (btn) {
    const s = getComputedStyle(btn);
    out.paint.button = {
      background: s.backgroundColor,
      color: s.color,
    };
  }
  const link = document.querySelector("a");
  if (link) {
    const s = getComputedStyle(link);
    out.paint.link = { color: s.color };
  }

  out.fonts = [...fonts].slice(0, 6);
  return out;
};
`;

// ─── Main ─────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs();
  if (!args.url) {
    console.error("✖ --url <url> is required");
    console.error("Usage: node scripts/extract-tokens.mjs --url <url> [--out <path>]");
    process.exit(2);
  }

  const slug = slugFromUrl(args.url);
  const outPath = args.out
    ? resolve(args.out)
    : join(ROOT, "tokens/seeds/_cache", `${slug}.json`);

  // Lazy-load playwright with friendly error
  let chromium;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    console.error("✖ playwright is not installed in this project.");
    console.error("  Install it with: pnpm add -D playwright && pnpm exec playwright install chromium");
    process.exit(3);
  }

  console.log(`→ launching chromium…`);
  const browser = await chromium.launch({ headless: true });
  let raw;
  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121 Safari/537.36",
    });
    const page = await ctx.newPage();
    console.log(`→ navigating to ${args.url}…`);
    await page.goto(args.url, { waitUntil: "networkidle", timeout: 45000 });
    raw = await page.evaluate(new Function(`return (${browserScript})()`));
  } finally {
    await browser.close();
  }

  // ─── Build token set ───────────────────────────────────────────────
  const usedNames = new Set();
  const colors = {};

  // Background of body first → paper-base / midnight-void candidate
  const bg = parseCssColor(raw.body.background);
  if (bg) {
    const key = nameColor(bg, usedNames);
    colors[key] = {
      value: rgbToHex(bg.r, bg.g, bg.b),
      role: "Primary surface — page background",
      context: inferContext(bg),
    };
  }

  // body color → primary text
  const text = parseCssColor(raw.body.color);
  if (text) {
    const key = nameColor(text, usedNames);
    colors[key] = {
      value: rgbToHex(text.r, text.g, text.b),
      role: "Primary text on page background",
      context: inferContext(text),
    };
  }

  // top paint colors
  for (const { color } of raw.paint.topColors || []) {
    const c = parseCssColor(color);
    if (!c) continue;
    const hex = rgbToHex(c.r, c.g, c.b);
    // skip if duplicate value
    if (Object.values(colors).some((e) => e.value === hex)) continue;
    const key = nameColor(c, usedNames);
    colors[key] = {
      value: hex,
      role: inferRole(c),
      context: inferContext(c),
    };
    if (Object.keys(colors).length >= 8) break;
  }

  // Ensure ≥5 colors — pad with neutrals if needed
  if (Object.keys(colors).length < 5) {
    const fallbacks = [
      ["--color-paper-base", "#FFFFFF", "Primary light surface", "pure white"],
      ["--color-jet-anchor", "#000000", "Primary dark surface", "pure black"],
      ["--color-graphite-body", "#646464", "Body text on light surfaces", "mid grey"],
      ["--color-fog-divider", "#EEEEEE", "Hairline dividers", "near-white"],
      ["--color-shadow-surface", "#1A1A1A", "Elevated dark surface", "lifted black"],
    ];
    for (const [k, v, role, ctx] of fallbacks) {
      if (colors[k]) continue;
      colors[k] = { value: v, role, context: ctx };
      if (Object.keys(colors).length >= 5) break;
    }
  }

  // Typography
  const typography = {};
  const fonts = raw.fonts || [];
  if (fonts.length >= 1) {
    typography["--font-display-extracted"] = {
      value: fonts[0],
      role: "Display headlines (extracted from h1 / body)",
      weights: [
        parseInt(raw.paint.h1?.fontWeight) || 600,
      ],
      sizes: raw.paint.h1?.fontSize || "unknown",
    };
  }
  if (fonts.length >= 2) {
    typography["--font-body-extracted"] = {
      value: fonts[1],
      role: "Body copy (extracted from body computed style)",
      weights: [400, 500],
      sizes: raw.body.fontSize || "unknown",
    };
  } else if (fonts.length === 1) {
    // duplicate single-font into body slot so schema (≥1 body) is satisfied
    typography["--font-body-extracted"] = {
      value: fonts[0],
      role: "Body copy (same family as display)",
      weights: [400],
      sizes: raw.body.fontSize || "unknown",
    };
  } else {
    typography["--font-display-extracted"] = {
      value: raw.body.fontFamily || "system-ui, sans-serif",
      role: "Display headlines (fallback to body computed)",
      weights: [600],
      sizes: "unknown",
    };
    typography["--font-body-extracted"] = {
      value: raw.body.fontFamily || "system-ui, sans-serif",
      role: "Body copy",
      weights: [400],
      sizes: raw.body.fontSize || "unknown",
    };
  }

  const tokenSet = {
    $schema: "../tokens.schema.json",
    id: slug,
    name: slug,
    description: `Auto-extracted token set from ${args.url}. Heuristic naming; review before promoting to a seed.`,
    source: args.url,
    extractedAt: new Date().toISOString().slice(0, 10),
    extractionMethod: "playwright-scrape",
    tokens: {
      colors,
      typography,
      spacing: {
        "--space-tight": "clamp(8px, 1vw, 12px)",
        "--space-base": "clamp(16px, 2vw, 24px)",
        "--space-section": "clamp(56px, 7vw, 120px)",
      },
      radii: {
        "--radius-tight": "4px",
        "--radius-card": "8px",
        "--radius-pill": "9999px",
      },
    },
    antiPatterns: [
      "Auto-extracted token set — review accent-vs-surface roles before shipping. Heuristic naming may misclassify a hover/active state as a 'spark' accent.",
      "Spacing + radii are scaffolded defaults, not observed. Overwrite with measured values before promoting this cache file to seeds/.",
    ],
    _unverified: Object.keys(colors).filter((k) => k.includes("extra")),
  };

  // Write
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(tokenSet, null, 2) + "\n");

  // Summary
  console.log(`\n✓ extracted token set for ${args.url}`);
  console.log(`  colors: ${Object.keys(colors).length}`);
  console.log(`  fonts:  ${Object.keys(typography).length}`);
  console.log(`  out:    ${outPath}`);
  if (tokenSet._unverified.length > 0) {
    console.log(`  ⚠ ${tokenSet._unverified.length} unverified keys — see _unverified`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("✖ extractor failed:", err.message);
  process.exit(1);
});

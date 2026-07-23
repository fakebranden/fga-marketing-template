// Tests for the reference-style token resolver (design engine Increment 2).
// The invariants that matter: whatever the seed's own naming/mode, the resolved
// slots are always a LIGHT surface + DARK ink + the signature accent (so the
// template composition stays legible), and two different seeds produce visibly
// different palettes + fonts on the same content.
import { describe, expect, it } from "vitest";
import {
  luminance,
  parseFontValue,
  resolveTokens,
  saturation,
} from "./resolve-tokens.mjs";

// A dark-first seed (like linear) — primary surface is near-black, text is light.
const DARK_FIRST = {
  tokens: {
    colors: {
      "--color-midnight-void": { value: "#08090A", role: "Primary surface — page background, the canvas" },
      "--color-cloud-whisper": { value: "#F7F8F8", role: "Primary text on midnight-void — headlines" },
      "--color-violet-spark": { value: "#5E6AD2", role: "Signature accent — CTAs, active states" },
      "--color-graphite-body": { value: "#8A8F98", role: "Secondary body text, captions" },
      "--color-ash-divider": { value: "#26282E", role: "Hairline dividers, low-emphasis borders" },
    },
    typography: {
      "--font-display-inter": { value: '"Inter", -apple-system, sans-serif' },
      "--font-body-inter": { value: '"Inter", -apple-system, sans-serif' },
    },
    radii: { "--radius-card": "8px", "--radius-tight": "4px" },
  },
};

// A light-first seed (like eleven-madison-park) — cream paper, emerald ink, gold
// accent, serif display.
const LIGHT_FIRST = {
  tokens: {
    colors: {
      "--color-bone-cream": { value: "#F1ECE0", role: "Primary surface — page background, menu pages" },
      "--color-emerald-anchor": { value: "#1F3A2E", role: "Primary text + ceremonial dark surfaces" },
      "--color-gold-restraint": { value: "#9F8753", role: "Signature accent — section ornaments" },
      "--color-shadow-surface": { value: "#E5DECC", role: "Alternating section background" },
      "--color-fog-divider": { value: "#D8D1BD", role: "Hairline dividers, low-emphasis borders" },
      "--color-graphite-body": { value: "#5E5E5A", role: "Secondary body text — captions" },
    },
    typography: {
      "--font-display-cardo": { value: '"Cardo", "Tiempos Headline", Garamond, serif' },
      "--font-body-grotesk": { value: '"Söhne", "Inter", system-ui, sans-serif' },
    },
    radii: { "--radius-card": "2px", "--radius-tight": "0px" },
  },
};

describe("parseFontValue", () => {
  it("splits the primary family from its fallback stack", () => {
    expect(parseFontValue('"Cardo", "Tiempos Headline", Garamond, serif')).toEqual({
      family: "Cardo",
      fallback: '"Tiempos Headline", Garamond, serif',
    });
  });
  it("keeps a serif generic when the stack is serif and has no explicit fallback", () => {
    expect(parseFontValue('"Cardo"').fallback).toMatch(/serif$/);
  });
  it("returns null for empty input", () => {
    expect(parseFontValue("")).toBeNull();
    expect(parseFontValue(undefined)).toBeNull();
  });
});

describe("resolveTokens — readability guarantee", () => {
  for (const [label, seed] of [["dark-first", DARK_FIRST], ["light-first", LIGHT_FIRST]]) {
    it(`${label}: resolves a LIGHT surface + DARK ink`, () => {
      const r = resolveTokens(seed);
      expect(luminance(r.colors.surface)).toBeGreaterThan(175);
      expect(luminance(r.colors.ink)).toBeLessThan(130);
      // ink must be darker than surface (contrast direction correct)
      expect(luminance(r.colors.ink)).toBeLessThan(luminance(r.colors.surface));
    });
  }

  it("dark-first: uses the light tone as paper and the dark tone as ink", () => {
    const r = resolveTokens(DARK_FIRST);
    expect(r.colors.surface).toBe("#f7f8f8");
    expect(r.colors.ink).toBe("#08090a");
    expect(r.colors.accent).toBe("#5e6ad2");
  });

  it("light-first: takes cream paper, emerald ink, gold accent", () => {
    const r = resolveTokens(LIGHT_FIRST);
    expect(r.colors.surface).toBe("#f1ece0");
    expect(r.colors.ink).toBe("#1f3a2e");
    expect(r.colors.accent).toBe("#9f8753");
    // the seed's own light alternating band is honored as surface_soft
    expect(r.colors.surface_soft).toBe("#e5decc");
  });
});

describe("resolveTokens — two seeds differ visibly", () => {
  it("produce different surface, ink, accent, and display font", () => {
    const a = resolveTokens(DARK_FIRST);
    const b = resolveTokens(LIGHT_FIRST);
    expect(a.colors.surface).not.toBe(b.colors.surface);
    expect(a.colors.ink).not.toBe(b.colors.ink);
    expect(a.colors.accent).not.toBe(b.colors.accent);
    expect(a.fonts.display).toBe("Inter");
    expect(b.fonts.display).toBe("Cardo");
    expect(a.radius).toBe("8px");
    expect(b.radius).toBe("2px");
  });
});

describe("resolveTokens — full color slot set + accent fallback", () => {
  it("emits every template color slot", () => {
    const r = resolveTokens(LIGHT_FIRST);
    for (const k of ["primary","primary_dark","primary_soft","accent","accent_dark","surface","surface_soft","ink","ink_soft","mute","line","line_soft"]) {
      expect(r.colors[k], k).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
  it("falls back to the most-saturated hue when no signature accent role exists", () => {
    const noAccent = { tokens: { colors: {
      "--color-paper": { value: "#FFFFFF", role: "Primary surface — page background" },
      "--color-ink": { value: "#111111", role: "Primary text" },
      "--color-brand-blue": { value: "#2266EE", role: "brand color used across the UI" },
    }, typography: {}, radii: {} } };
    const r = resolveTokens(noAccent);
    expect(r.colors.accent).toBe("#2266ee");
    expect(saturation("#2266ee")).toBeGreaterThan(0.5);
  });
  it("returns null for a token set with no usable colors", () => {
    expect(resolveTokens({ tokens: { colors: {}, typography: {}, radii: {} } })).toBeNull();
    expect(resolveTokens(null)).toBeNull();
  });
});

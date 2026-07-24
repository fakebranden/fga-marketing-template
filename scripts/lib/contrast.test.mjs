// Tests for WCAG AA contrast enforcement on the merged palette.
//
// The invariant that matters: after enforcePaletteContrast, EVERY pair the
// stylesheet actually renders clears 4.5:1 — for any reference-style seed
// combined with any client brand kit. Before this module existed, 174 of 324
// audited pairs were below AA and `.t-accent` failed on all nine styles.
import { describe, expect, it } from "vitest";
import {
  auditPalette,
  contrastRatio,
  ensureContrast,
  enforcePaletteContrast,
  onColor,
  relativeLuminance,
} from "./contrast.mjs";

const AA = 4.5;

describe("relativeLuminance / contrastRatio", () => {
  it("matches the WCAG reference values at the extremes", () => {
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 2);
  });

  it("is order-independent", () => {
    expect(contrastRatio("#767676", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#767676"),
      6,
    );
  });

  it("agrees with known published ratios", () => {
    // #767676 on white is the canonical 'just passes AA' gray.
    expect(contrastRatio("#767676", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
  });

  it("is NOT the YIQ brightness the old resolver used", () => {
    // #0066cc vs #0052a3: YIQ brightness says these are far apart enough to be
    // a safe text/background pair; the real ratio is 1.38:1.
    expect(contrastRatio("#0052a3", "#0066cc")).toBeLessThan(1.5);
  });
});

describe("ensureContrast", () => {
  it("leaves an already-passing color untouched", () => {
    expect(ensureContrast("#000000", ["#ffffff"], AA)).toBe("#000000");
  });

  it("repairs a failing color to meet the threshold", () => {
    const fixed = ensureContrast("#aaaaaa", ["#ffffff"], AA);
    expect(contrastRatio(fixed, "#ffffff")).toBeGreaterThanOrEqual(AA);
  });

  it("satisfies EVERY background it is given, not just the first", () => {
    const fixed = ensureContrast("#999999", ["#ffffff", "#f0f0f0"], AA);
    expect(contrastRatio(fixed, "#ffffff")).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(fixed, "#f0f0f0")).toBeGreaterThanOrEqual(AA);
  });

  it("preserves hue while repairing (does not slide to gray)", () => {
    // A washed-out blue on white must stay recognisably blue.
    const fixed = ensureContrast("#9ab8e8", ["#ffffff"], AA);
    const h = fixed.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const b = parseInt(h.slice(4, 6), 16);
    expect(b).toBeGreaterThan(r);
  });
});

describe("onColor", () => {
  it("returns readable text for a light background", () => {
    const c = onColor("#F59E0B");
    expect(contrastRatio(c, "#F59E0B")).toBeGreaterThanOrEqual(AA);
  });

  it("returns readable text for a near-black background", () => {
    const c = onColor("#001531");
    expect(contrastRatio(c, "#001531")).toBeGreaterThanOrEqual(AA);
  });

  it("does not collapse to a timid mid-gray on a dark band", () => {
    // Regression: a first implementation returned #808080 (exactly 4.5:1).
    expect(contrastRatio(onColor("#0F172A"), "#0F172A")).toBeGreaterThanOrEqual(6.5);
  });
});

describe("enforcePaletteContrast", () => {
  const TEMPLATE_DEFAULT = {
    primary: "#0F172A", primary_dark: "#020617", primary_soft: "#E2E8F0",
    accent: "#F59E0B", accent_dark: "#B45309",
    surface: "#FFFFFF", surface_soft: "#F8FAFC",
    ink: "#0F172A", ink_soft: "#334155", mute: "#64748B",
    line: "#E2E8F0", line_soft: "#F1F5F9",
  };

  // The live franchi-law palette: eleven-madison-park seed + the client kit.
  const LIVE_FRANCHI = {
    ...TEMPLATE_DEFAULT,
    surface: "#f1ece0", surface_soft: "#e5decc", mute: "#5e5e5a",
    primary: "#001531", primary_dark: "#001025",
    ink: "#001531", ink_soft: "#47576b",
    accent: "#254d74", accent_dark: "#1e3e5d",
  };

  // A kit whose colors are actively hostile: a near-white-on-yellow brand.
  const HOSTILE = {
    ...TEMPLATE_DEFAULT,
    ink: "#f6eb1e", ink_soft: "#8a840f",
    primary: "#f6eb1e", primary_dark: "#c4bb18",
    accent: "#f6eb1e", accent_dark: "#c4bb18",
  };

  for (const [name, palette] of Object.entries({ TEMPLATE_DEFAULT, LIVE_FRANCHI, HOSTILE })) {
    it(`leaves no rendered pair below AA — ${name}`, () => {
      expect(auditPalette(enforcePaletteContrast(palette))).toEqual([]);
    });
  }

  it("catches the live franchi-law .t-accent failure BEFORE enforcement", () => {
    // 1.26:1 shipped to production on 2026-07-23.
    expect(contrastRatio(LIVE_FRANCHI.accent_dark, LIVE_FRANCHI.accent)).toBeLessThan(1.5);
  });

  it("derives on_accent and on_primary", () => {
    const fixed = enforcePaletteContrast(LIVE_FRANCHI);
    expect(fixed.on_accent).toMatch(/^#[0-9a-f]{6}$/);
    expect(fixed.on_primary).toMatch(/^#[0-9a-f]{6}$/);
    expect(contrastRatio(fixed.on_accent, fixed.accent)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(fixed.on_primary, fixed.primary)).toBeGreaterThanOrEqual(AA);
  });

  it("keeps the hover shade readable with the same on_accent", () => {
    const fixed = enforcePaletteContrast(TEMPLATE_DEFAULT);
    expect(contrastRatio(fixed.on_accent, fixed.accent_dark)).toBeGreaterThanOrEqual(AA);
  });

  it("never moves the surfaces (the surface IS the design)", () => {
    const fixed = enforcePaletteContrast(LIVE_FRANCHI);
    expect(fixed.surface).toBe(LIVE_FRANCHI.surface);
    expect(fixed.surface_soft).toBe(LIVE_FRANCHI.surface_soft);
  });

  it("is idempotent", () => {
    const once = enforcePaletteContrast(LIVE_FRANCHI);
    expect(enforcePaletteContrast(once)).toEqual(once);
  });

  it("does not mutate its input", () => {
    const input = { ...HOSTILE };
    const snapshot = JSON.stringify(input);
    enforcePaletteContrast(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

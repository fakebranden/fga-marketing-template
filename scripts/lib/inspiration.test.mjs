// Tests for the inspiration mapper (design engine Increment 3, URL analysis).
// The load-bearing invariant: inspiration deals ONLY in layout/rhythm/motion —
// the mapper output contains no color/font, and the CSS vars it emits are only
// --section-scale + --maxw. Anti-mimicry lives or dies here.
import { describe, expect, it } from "vitest";
import { inspirationToLayoutVars, layoutToInspiration } from "./inspiration.mjs";

describe("layoutToInspiration — vertical rhythm", () => {
  it("classifies a spacious site (big section padding)", () => {
    const i = layoutToInspiration({ sectionPaddingVh: 0.24, contentWidthPx: 1100, animatedRatio: 0.1 });
    expect(i.density).toBe("spacious");
    expect(i.sectionScale).toBeGreaterThan(1);
  });
  it("classifies a compact site (tight section padding)", () => {
    const i = layoutToInspiration({ sectionPaddingVh: 0.05, contentWidthPx: 1100, animatedRatio: 0.1 });
    expect(i.density).toBe("compact");
    expect(i.sectionScale).toBeLessThan(1);
  });
  it("classifies a balanced site", () => {
    expect(layoutToInspiration({ sectionPaddingVh: 0.12 }).density).toBe("balanced");
  });
});

describe("layoutToInspiration — content measure", () => {
  it("narrow editorial", () => {
    expect(layoutToInspiration({ contentWidthPx: 680 }).measure).toBe("narrow");
  });
  it("wide utilitarian", () => {
    expect(layoutToInspiration({ contentWidthPx: 1320 }).measure).toBe("wide");
  });
});

describe("layoutToInspiration — motion + robustness", () => {
  it("reads motion intensity", () => {
    expect(layoutToInspiration({ animatedRatio: 0.22 }).motion).toBe("lively");
    expect(layoutToInspiration({ animatedRatio: 0.01 }).motion).toBe("calm");
  });
  it("falls back to balanced middle for missing / NaN metrics", () => {
    const i = layoutToInspiration({});
    expect(i.density).toBe("balanced");
    expect(i.measure).toBe("balanced");
    expect(i.motion).toBe("balanced");
    const i2 = layoutToInspiration(null);
    expect(i2.density).toBe("balanced");
  });
  it("carries the raw metrics for traceability", () => {
    const i = layoutToInspiration({ sectionPaddingVh: 0.2, contentWidthPx: 700, animatedRatio: 0.2 });
    expect(i._metrics.contentWidthPx).toBe(700);
  });
});

// NOTE: palette + type from a reference are applied by merging into
// brand.colors / brand.fonts (see generate-pages), NOT as layout CSS vars. So
// this helper stays layout-only by design even after the 2026-07-24 scope
// change — it is the geometry channel, not the identity channel.
describe("inspirationToLayoutVars — geometry channel only", () => {
  it("emits only --section-scale and --maxw, never color/font", () => {
    const vars = inspirationToLayoutVars(layoutToInspiration({ sectionPaddingVh: 0.24, contentWidthPx: 680 }));
    expect(Object.keys(vars).sort()).toEqual(["--maxw", "--section-scale"]);
    // hard guarantee: no palette / type key can appear
    for (const k of Object.keys(vars)) {
      expect(k).not.toMatch(/color|primary|accent|ink|surface|font/);
    }
    expect(vars["--maxw"]).toMatch(/rem$/);
  });
  it("returns {} for missing inspiration", () => {
    expect(inspirationToLayoutVars(null)).toEqual({});
    expect(inspirationToLayoutVars(undefined)).toEqual({});
  });
});

// Palette + type extraction. Added 2026-07-24 when the operator reversed the
// anti-mimicry scope: a reference URL must now drive the full look, so that
// pointing the tool at a site actually produces a sibling of it.
describe("layoutToInspiration — palette + type from the reference", () => {
  const withColor = {
    sectionPaddingVh: 0.12,
    contentWidthPx: 900,
    surfaceHex: "#0B0B0F",
    inkHex: "#F5F5F7",
    accentHex: "#5E6AD2",
    displayFamily: "Cardo",
    bodyFamily: "Manrope",
  };

  it("lifts surface / ink / accent off the reference", () => {
    const i = layoutToInspiration(withColor);
    expect(i.colors).toEqual({ surface: "#0b0b0f", ink: "#f5f5f7", accent: "#5e6ad2" });
  });

  it("lifts display + body families", () => {
    const i = layoutToInspiration(withColor);
    expect(i.fonts).toEqual({ display: "Cardo", body: "Manrope" });
  });

  it("normalises hex case and accepts a bare (unprefixed) hex", () => {
    const i = layoutToInspiration({ ...withColor, surfaceHex: "FFAA00" });
    expect(i.colors.surface).toBe("#ffaa00");
  });

  it("omits colors entirely when the page yielded none", () => {
    const i = layoutToInspiration({ sectionPaddingVh: 0.12, contentWidthPx: 900 });
    expect(i.colors).toBeUndefined();
    expect(i.fonts).toBeUndefined();
  });

  it("ignores malformed hex rather than poisoning the palette", () => {
    const i = layoutToInspiration({ ...withColor, accentHex: "rgb(1,2,3)" });
    expect(i.colors.accent).toBeUndefined();
    expect(i.colors.surface).toBe("#0b0b0f");
  });

  it("drops generic font stacks — they carry no design signal", () => {
    for (const generic of ["system-ui", "sans-serif", "Arial", "-apple-system", "monospace"]) {
      const i = layoutToInspiration({ ...withColor, displayFamily: generic });
      expect(i.fonts.display).toBeUndefined();
      expect(i.fonts.body).toBe("Manrope");
    }
  });

  it("still returns layout signals alongside the new palette", () => {
    const i = layoutToInspiration(withColor);
    expect(i.density).toBeDefined();
    expect(i.measure).toBeDefined();
    expect(i.motion).toBeDefined();
  });
});

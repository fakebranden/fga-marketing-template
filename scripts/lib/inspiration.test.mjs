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

describe("inspirationToLayoutVars — LAYOUT ONLY (anti-mimicry)", () => {
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

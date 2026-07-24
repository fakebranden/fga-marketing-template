// Tests for the rendered-text legibility judgement.
//
// The bug these exist to keep dead: the franchi-law hero shipped a dark-green
// 112px headline laid straight across a near-black WebGL sphere at 1.0:1, with
// 63-79% of each line's pixels below threshold. Palette-level contrast checking
// could not see it, because the background there is rendered pixels rather than
// a token. These cover the decision logic; check-text-legibility.mjs does the
// browser work.
import { describe, expect, it } from "vitest";
import {
  wcagThreshold, rgbToHex, cssColorToHex, judgeSamples,
  mergeFrameVerdicts, overflowFraction, intersectionOverSmaller,
} from "./legibility.mjs";

// The real measurements taken from the live lander before the fix.
const HERO_INK = "#1f3a2e";           // rgb(31,58,46) — the headline colour
const SPHERE = [52, 52, 60];          // the worst background pixel measured
const PAPER = [241, 236, 224];        // the surface it was supposed to sit on

describe("wcagThreshold", () => {
  it("holds body text to 4.5:1", () => {
    expect(wcagThreshold({ fontSizePx: 16, fontWeight: 400 })).toBe(4.5);
    expect(wcagThreshold({ fontSizePx: 23.9, fontWeight: 400 })).toBe(4.5);
  });

  it("holds large text to 3:1 at 24px and above", () => {
    expect(wcagThreshold({ fontSizePx: 24, fontWeight: 400 })).toBe(3);
    expect(wcagThreshold({ fontSizePx: 112, fontWeight: 700 })).toBe(3);
  });

  it("treats bold 18.66px as large, but not bold 18px", () => {
    expect(wcagThreshold({ fontSizePx: 18.66, fontWeight: 700 })).toBe(3);
    expect(wcagThreshold({ fontSizePx: 18, fontWeight: 700 })).toBe(4.5);
    expect(wcagThreshold({ fontSizePx: 18.66, fontWeight: 400 })).toBe(4.5);
  });

  it("survives missing or junk metrics rather than throwing", () => {
    expect(wcagThreshold({})).toBe(4.5);
    expect(wcagThreshold({ fontSizePx: "not a number", fontWeight: null })).toBe(4.5);
  });
});

describe("colour parsing", () => {
  it("converts rgb triplets to hex", () => {
    expect(rgbToHex([31, 58, 46])).toBe("#1f3a2e");
    expect(rgbToHex([0, 0, 0])).toBe("#000000");
    expect(rgbToHex([255, 255, 255])).toBe("#ffffff");
  });

  it("clamps and rounds out-of-range channels", () => {
    expect(rgbToHex([-5, 300, 46.6])).toBe("#00ff2f");
  });

  it("parses computed rgb() and rgba() strings", () => {
    expect(cssColorToHex("rgb(31, 58, 46)")).toBe("#1f3a2e");
    expect(cssColorToHex("rgba(31, 58, 46, 0.9)")).toBe("#1f3a2e");
  });

  it("returns null for values it cannot read", () => {
    expect(cssColorToHex("transparent")).toBeNull();
    expect(cssColorToHex(null)).toBeNull();
    expect(rgbToHex([1, 2])).toBeNull();
  });
});

describe("judgeSamples", () => {
  it("fails the real hero defect", () => {
    // the measured case: most of the line over the sphere
    const samples = [...Array(70).fill(SPHERE), ...Array(30).fill(PAPER)];
    const v = judgeSamples({ colorHex: HERO_INK, samples, threshold: 3 });
    expect(v.pass).toBe(false);
    expect(v.worst).toBeLessThan(1.2);
    expect(v.pctBelow).toBeCloseTo(70, 0);
  });

  it("passes the same headline once it sits on the surface", () => {
    const v = judgeSamples({ colorHex: HERO_INK, samples: Array(100).fill(PAPER), threshold: 3 });
    expect(v.pass).toBe(true);
    expect(v.worst).toBeGreaterThan(8);
    expect(v.pctBelow).toBe(0);
  });

  it("does not fail a line for a handful of stray edge pixels", () => {
    // 1 dark pixel in 200 — a gradient shoulder, not an unreadable line.
    const samples = [...Array(199).fill(PAPER), SPHERE];
    const v = judgeSamples({ colorHex: HERO_INK, samples, threshold: 3 });
    expect(v.pass).toBe(true);
    expect(v.worst).toBeLessThan(1.2);   // still REPORTS the worst pixel
    expect(v.pctBelow).toBeLessThan(1);
  });

  it("fails once the affected area crosses the tolerance", () => {
    const samples = [...Array(95).fill(PAPER), ...Array(5).fill(SPHERE)];
    expect(judgeSamples({ colorHex: HERO_INK, samples, threshold: 3 }).pass).toBe(false);
  });

  it("honours an explicit tolerance", () => {
    const samples = [...Array(95).fill(PAPER), ...Array(5).fill(SPHERE)];
    expect(judgeSamples({ colorHex: HERO_INK, samples, threshold: 3, tolerancePct: 10 }).pass).toBe(true);
  });

  it("skips rather than passing when there is nothing to judge", () => {
    expect(judgeSamples({ colorHex: HERO_INK, samples: [], threshold: 3 }).skipped).toBe(true);
    expect(judgeSamples({ colorHex: null, samples: [PAPER], threshold: 3 }).skipped).toBe(true);
  });

  it("applies the size-dependent threshold to the same colour on the same background", () => {
    // #787874 on this cream is 3.76:1 — legal as large text, illegal as body copy
    const midGrey = "#787874";
    expect(judgeSamples({ colorHex: midGrey, samples: Array(50).fill(PAPER), threshold: 3 }).pass).toBe(true);
    expect(judgeSamples({ colorHex: midGrey, samples: Array(50).fill(PAPER), threshold: 4.5 }).pass).toBe(false);
  });

  it("fails the brand gold kicker at BOTH thresholds", () => {
    // #9f8753 on cream is only 2.94:1, which is why the CTA kicker moved to ink-soft
    const gold = "#9f8753";
    expect(judgeSamples({ colorHex: gold, samples: Array(50).fill(PAPER), threshold: 3 }).pass).toBe(false);
    expect(judgeSamples({ colorHex: gold, samples: Array(50).fill(PAPER), threshold: 4.5 }).pass).toBe(false);
  });
});

describe("mergeFrameVerdicts", () => {
  it("keeps the worst frame, because the hero object drifts", () => {
    const good = judgeSamples({ colorHex: HERO_INK, samples: Array(100).fill(PAPER), threshold: 3 });
    const bad = judgeSamples({ colorHex: HERO_INK, samples: Array(100).fill(SPHERE), threshold: 3 });
    expect(mergeFrameVerdicts([good, bad, good]).pass).toBe(false);
    expect(mergeFrameVerdicts([good, good]).pass).toBe(true);
  });

  it("breaks ties on absolute contrast", () => {
    const a = { skipped: false, pass: true, worst: 9, pctBelow: 0 };
    const b = { skipped: false, pass: true, worst: 4, pctBelow: 0 };
    expect(mergeFrameVerdicts([a, b]).worst).toBe(4);
  });

  it("skips when every frame skipped", () => {
    expect(mergeFrameVerdicts([{ skipped: true }, { skipped: true }]).skipped).toBe(true);
    expect(mergeFrameVerdicts([]).skipped).toBe(true);
  });
});

describe("overflowFraction", () => {
  const hero = { x: 0, y: 0, w: 1440, h: 900 };

  it("is zero for a contained line", () => {
    expect(overflowFraction({ x: 280, y: 300, w: 700, h: 90 }, hero)).toBe(0);
  });

  it("catches a headline that has grown out of the top of its hero", () => {
    // the intermediate regression: the block outgrew the section and the first
    // line rendered above y=0, on top of the nav
    // 2px of bleed is forgiven by the tolerance, so 58 of the 60 count
    expect(overflowFraction({ x: 280, y: -60, w: 700, h: 90 }, hero)).toBeCloseTo(58 / 90, 2);
  });

  it("reports fully escaped text as 1", () => {
    expect(overflowFraction({ x: 280, y: -400, w: 700, h: 90 }, hero)).toBe(1);
  });

  it("tolerates sub-pixel bleed", () => {
    expect(overflowFraction({ x: 280, y: -1, w: 700, h: 90 }, hero)).toBe(0);
  });
});

describe("intersectionOverSmaller", () => {
  it("is zero for separated columns (the fixed hero layout)", () => {
    const type = { x: 80, y: 300, w: 640, h: 300 };
    const media = { x: 864, y: 0, w: 576, h: 900 };
    expect(intersectionOverSmaller(type, media)).toBe(0);
  });

  it("reports a nav link fully covered by an oversized headline", () => {
    const nav = { x: 546, y: 58, w: 104, h: 14 };
    const headline = { x: 280, y: 0, w: 700, h: 130 };
    expect(intersectionOverSmaller(nav, headline)).toBe(1);
  });

  it("is symmetric", () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    const b = { x: 50, y: 50, w: 200, h: 200 };
    expect(intersectionOverSmaller(a, b)).toBeCloseTo(intersectionOverSmaller(b, a), 6);
  });
});

// Tests for the brand → runtime style wiring (design engine Increment 1).
// Invariants: valid hex colors become the right CSS var names; non-hex is
// dropped (template default stands in); the default Fraunces/Inter pairing emits
// NO font override or Google link (next/font owns it); a custom pairing emits
// both, family-only (no weight axis that could 400).
import { describe, expect, it } from "vitest";
import {
  brandColorVars,
  brandFontVars,
  brandStyleVars,
  fontsAreCustom,
  googleFontsHref,
} from "./brand-style";

describe("brandColorVars", () => {
  it("maps snake_case tokens to hyphenated CSS vars", () => {
    expect(brandColorVars({ primary: "#252525", primary_dark: "#111111", accent: "#f6eb1e" })).toEqual({
      "--primary": "#252525",
      "--primary-dark": "#111111",
      "--accent": "#f6eb1e",
    });
  });
  it("accepts 3-digit hex and skips non-hex / non-string values", () => {
    expect(brandColorVars({ primary: "#abc", accent: "rebeccapurple", ink: 123 })).toEqual({
      "--primary": "#abc",
    });
  });
  it("returns {} for missing / non-object colors", () => {
    expect(brandColorVars(undefined)).toEqual({});
    expect(brandColorVars(null)).toEqual({});
  });
});

describe("fontsAreCustom", () => {
  it("is false for the template defaults and for empty fonts", () => {
    expect(fontsAreCustom({ display: "Fraunces", body: "Inter" })).toBe(false);
    expect(fontsAreCustom(undefined)).toBe(false);
    expect(fontsAreCustom({})).toBe(false);
  });
  it("is true when either font differs from the default", () => {
    expect(fontsAreCustom({ display: "Anton", body: "Inter" })).toBe(true);
    expect(fontsAreCustom({ display: "Fraunces", body: "Poppins" })).toBe(true);
  });
});

describe("brandFontVars", () => {
  it("emits nothing for the default pairing", () => {
    expect(brandFontVars({ display: "Fraunces", body: "Inter" })).toEqual({});
  });
  it("emits quoted family + fallback for a custom pairing", () => {
    const v = brandFontVars({ display: "Anton", body: "Poppins" });
    expect(v["--font-display"]).toMatch(/^"Anton", /);
    expect(v["--font-body"]).toMatch(/^"Poppins", /);
  });
  it("honors explicit fallbacks", () => {
    const v = brandFontVars({ display: "Anton", body: "Poppins", display_fallback: "serif", body_fallback: "sans-serif" });
    expect(v["--font-display"]).toBe('"Anton", serif');
    expect(v["--font-body"]).toBe('"Poppins", sans-serif');
  });
});

describe("googleFontsHref", () => {
  it("is null for the default pairing", () => {
    expect(googleFontsHref({ display: "Fraunces", body: "Inter" })).toBeNull();
  });
  it("requests both families, url-encoded with +, no weight axis", () => {
    const href = googleFontsHref({ display: "Anton", body: "Playfair Display" });
    expect(href).toBe(
      "https://fonts.googleapis.com/css2?family=Anton&family=Playfair+Display&display=swap",
    );
  });
  it("de-dupes when display and body are the same family", () => {
    expect(googleFontsHref({ display: "Poppins", body: "Poppins" })).toBe(
      "https://fonts.googleapis.com/css2?family=Poppins&display=swap",
    );
  });
});

describe("brandStyleVars", () => {
  it("merges color vars and custom font vars", () => {
    const vars = brandStyleVars({
      colors: { primary: "#252525", accent: "#f6eb1e" },
      fonts: { display: "Anton", body: "Poppins" },
    });
    expect(vars["--primary"]).toBe("#252525");
    expect(vars["--accent"]).toBe("#f6eb1e");
    expect(vars["--font-display"]).toMatch(/Anton/);
  });
  it("omits font vars for the default pairing", () => {
    const vars = brandStyleVars({ colors: { primary: "#252525" }, fonts: { display: "Fraunces", body: "Inter" } });
    expect(vars["--font-display"]).toBeUndefined();
    expect(vars["--primary"]).toBe("#252525");
  });
});

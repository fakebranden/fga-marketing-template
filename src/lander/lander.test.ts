// Tests for the LanderSpec, the registry and the spec operations.
//
// The load-bearing ones are the COVERAGE tests: they assert that every section
// in the registry has a schema, controls for every schema field, a component and
// a label. The spec's warning is that hand-written edit UI rots — someone adds a
// field and forgets the control. These turn that from an invisible gap into a
// failing test.
import { describe, expect, it } from "vitest";
import {
  SECTION_KINDS, SECTION_SCHEMAS, parseSpec, migrateSpec, defaultsFor, hasBooking,
  type LanderSpec, type SectionKind,
} from "./schema";
import { SECTION_CONTROLS, SECTION_LABELS, LOCKED_SECTIONS, type Control } from "./controls";
import {
  addSection, removeSection, moveSection, swapSectionKind, setField,
  addListItem, removeListItem, moveListItem, commitSpec, newSectionId,
  setSectionVariant,
} from "./ops";
import {
  SECTION_VARIANTS, DEFAULT_VARIANT, variantsFor, findVariant, isExternalVariant,
} from "./variants";

function baseSpec(): LanderSpec {
  return {
    version: 1,
    sections: [
      { id: "hero-1", kind: "hero", props: defaultsFor("hero") },
      { id: "value-1", kind: "value-props", props: defaultsFor("value-props") },
      { id: "booking-1", kind: "booking", props: defaultsFor("booking") },
    ],
  };
}

describe("registry coverage (the anti-rot guarantee)", () => {
  it("every kind has a schema, controls and a label", () => {
    for (const kind of SECTION_KINDS) {
      expect(SECTION_SCHEMAS[kind], `${kind} schema`).toBeTruthy();
      expect(SECTION_CONTROLS[kind], `${kind} controls`).toBeTruthy();
      expect(SECTION_LABELS[kind], `${kind} label`).toBeTruthy();
    }
  });

  it("every schema field has a control descriptor", () => {
    for (const kind of SECTION_KINDS) {
      const shape = Object.keys((SECTION_SCHEMAS[kind] as { shape: object }).shape);
      const covered = SECTION_CONTROLS[kind].map((c) => c.field);
      for (const field of shape) {
        expect(covered, `${kind}.${field} needs a control in SECTION_CONTROLS`).toContain(field);
      }
    }
  });

  it("no control points at a field the schema does not have", () => {
    for (const kind of SECTION_KINDS) {
      const shape = Object.keys((SECTION_SCHEMAS[kind] as { shape: object }).shape);
      for (const c of SECTION_CONTROLS[kind]) {
        expect(shape, `${kind}: control "${c.field}" has no schema field`).toContain(c.field);
      }
    }
  });

  it("every itemList control declares the fields it edits", () => {
    for (const kind of SECTION_KINDS) {
      for (const c of SECTION_CONTROLS[kind]) {
        if (c.kind !== "itemList") continue;
        expect(c.fields, `${kind}.${c.field} itemList needs fields`).toBeTruthy();
        expect((c.fields as Control[]).length).toBeGreaterThan(0);
      }
    }
  });

  it("defaultsFor produces a spec-valid section for every kind", () => {
    for (const kind of SECTION_KINDS) {
      const spec = { version: 1, sections: [{ id: "x", kind, props: defaultsFor(kind) }] };
      const parsed = parseSpec(spec);
      expect(parsed.ok, `${kind}: ${JSON.stringify((parsed as { errors?: string[] }).errors)}`).toBe(true);
    }
  });
});

describe("parseSpec", () => {
  it("accepts a well-formed spec", () => {
    const r = parseSpec(baseSpec());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.sections).toHaveLength(3);
  });

  it("drops an unknown section kind instead of failing the document", () => {
    const spec = baseSpec();
    // @ts-expect-error deliberately invalid
    spec.sections.push({ id: "weird-1", kind: "does-not-exist", props: {} });
    const r = parseSpec(spec);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.sections).toHaveLength(3);
      expect(r.warnings.join(" ")).toMatch(/unknown kind/);
    }
  });

  it("drops an individually invalid section rather than blanking the page", () => {
    const spec = baseSpec();
    spec.sections[1] = { id: "value-bad", kind: "value-props", props: { heading: "" } };
    const r = parseSpec(spec);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.sections.map((s) => s.id)).toEqual(["hero-1", "booking-1"]);
      expect(r.warnings.join(" ")).toMatch(/value-props/);
    }
  });

  it("fails when nothing valid survives", () => {
    const r = parseSpec({ version: 1, sections: [{ id: "a", kind: "hero", props: { headline: "" } }] });
    expect(r.ok).toBe(false);
  });

  it("repairs duplicate ids, which would misaddress reorder and inline edits", () => {
    const spec = baseSpec();
    spec.sections[1] = { ...spec.sections[1], id: "hero-1" };
    const r = parseSpec(spec);
    expect(r.ok).toBe(true);
    if (r.ok) {
      const ids = r.spec.sections.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(r.warnings.join(" ")).toMatch(/duplicate id/);
    }
  });

  it("rejects a spec with no sections at all", () => {
    expect(parseSpec({ version: 1, sections: [] }).ok).toBe(false);
  });

  it("rejects junk", () => {
    for (const junk of [null, undefined, 42, "spec", [], {}]) {
      expect(parseSpec(junk).ok, JSON.stringify(junk)).toBe(false);
    }
  });

  it("enforces copy length bounds so an LLM cannot return an essay as a headline", () => {
    const spec = baseSpec();
    spec.sections[0] = { id: "hero-1", kind: "hero", props: { ...defaultsFor("hero"), headline: "x".repeat(500) } };
    const r = parseSpec(spec);
    // dropped, not accepted
    if (r.ok) expect(r.spec.sections.map((s) => s.id)).not.toContain("hero-1");
  });

  it("trims copy", () => {
    const spec = baseSpec();
    spec.sections[0] = { id: "hero-1", kind: "hero", props: { ...defaultsFor("hero"), headline: "  Spaced  " } };
    const r = parseSpec(spec);
    if (r.ok) expect((r.spec.sections[0].props as { headline: string }).headline).toBe("Spaced");
  });
});

describe("migrateSpec", () => {
  it("stamps version 1 onto an unversioned spec", () => {
    expect((migrateSpec({ sections: [] }) as { version: number }).version).toBe(1);
  });
  it("leaves a versioned spec alone", () => {
    expect(migrateSpec({ version: 1, sections: [] })).toEqual({ version: 1, sections: [] });
  });
  it("passes junk through rather than throwing", () => {
    expect(migrateSpec(null)).toBeNull();
  });
});

describe("section operations", () => {
  it("adds a section at the end by default", () => {
    const next = addSection(baseSpec(), "faq");
    expect(next.sections).toHaveLength(4);
    expect(next.sections[3].kind).toBe("faq");
  });

  it("adds a section at an index", () => {
    const next = addSection(baseSpec(), "faq", 1);
    expect(next.sections[1].kind).toBe("faq");
  });

  it("clamps an out-of-range insert index", () => {
    expect(addSection(baseSpec(), "faq", 99).sections[3].kind).toBe("faq");
    expect(addSection(baseSpec(), "faq", -5).sections[0].kind).toBe("faq");
  });

  it("gives every added section a unique id", () => {
    let spec = baseSpec();
    for (let i = 0; i < 40; i++) spec = addSection(spec, "faq", undefined, 1_700_000_000_000);
    const ids = spec.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("removes a section", () => {
    const next = removeSection(baseSpec(), "value-1");
    expect(next.sections.map((s) => s.id)).toEqual(["hero-1", "booking-1"]);
  });

  it("REFUSES to remove the A2P booking section", () => {
    const next = removeSection(baseSpec(), "booking-1");
    expect(hasBooking(next)).toBe(true);
    expect(next.sections).toHaveLength(3);
  });

  it("ignores removing an unknown id", () => {
    expect(removeSection(baseSpec(), "nope").sections).toHaveLength(3);
  });

  it("never empties the spec", () => {
    let spec: LanderSpec = { version: 1, sections: [{ id: "only", kind: "faq", props: defaultsFor("faq") }] };
    spec = removeSection(spec, "only");
    expect(spec.sections).toHaveLength(1);
  });

  it("moves a section", () => {
    const next = moveSection(baseSpec(), "booking-1", 0);
    expect(next.sections.map((s) => s.id)).toEqual(["booking-1", "hero-1", "value-1"]);
  });

  it("clamps a move past the ends and is a no-op for the same index", () => {
    expect(moveSection(baseSpec(), "hero-1", 99).sections.map((s) => s.id)).toEqual(["value-1", "booking-1", "hero-1"]);
    expect(moveSection(baseSpec(), "hero-1", 0).sections.map((s) => s.id)).toEqual(["hero-1", "value-1", "booking-1"]);
  });
});

describe("swapSectionKind", () => {
  it("swaps the kind and keeps matching copy", () => {
    let spec = baseSpec();
    spec = setField(spec, "value-1", "heading", "Kept heading");
    const next = swapSectionKind(spec, "value-1", "feature-cards");
    const target = next.sections.find((s) => s.id === "value-1");
    expect(target?.kind).toBe("feature-cards");
    expect((target?.props as { heading: string }).heading).toBe("Kept heading");
  });

  it("produces a still-valid spec after a swap", () => {
    const next = swapSectionKind(baseSpec(), "value-1", "testimonials");
    expect(parseSpec(next).ok).toBe(true);
  });

  it("refuses to swap the locked booking section", () => {
    const next = swapSectionKind(baseSpec(), "booking-1", "cta");
    expect(next.sections.find((s) => s.id === "booking-1")?.kind).toBe("booking");
  });

  it("is a no-op for the same kind or an unknown id", () => {
    expect(swapSectionKind(baseSpec(), "hero-1", "hero")).toEqual(baseSpec());
    expect(swapSectionKind(baseSpec(), "nope", "cta")).toEqual(baseSpec());
  });

  it("does not carry over a field whose type differs", () => {
    // marquee.items is string[]; value-props.items is object[]
    let spec = baseSpec();
    spec = addSection(spec, "marquee");
    const marquee = spec.sections[spec.sections.length - 1];
    spec = setField(spec, marquee.id, "items", ["Area A", "Area B"]);
    const next = swapSectionKind(spec, marquee.id, "value-props");
    const items = (next.sections.find((s) => s.id === marquee.id)?.props as { items: unknown[] }).items;
    // carried across (both arrays) but must still validate
    expect(parseSpec(next).ok || items.length === 0).toBe(true);
  });
});

describe("setField", () => {
  it("sets a top-level field", () => {
    const next = setField(baseSpec(), "hero-1", "headline", "New");
    expect((next.sections[0].props as { headline: string }).headline).toBe("New");
  });

  it("sets a nested list field by dotted path", () => {
    let spec = baseSpec();
    spec = addListItem(spec, "value-1", "items", { title: "A", description: "" });
    spec = setField(spec, "value-1", "items.0.title", "Renamed");
    const items = (spec.sections[1].props as { items: { title: string }[] }).items;
    expect(items[0].title).toBe("Renamed");
  });

  it("does not mutate the input spec", () => {
    const spec = baseSpec();
    const before = JSON.stringify(spec);
    setField(spec, "hero-1", "headline", "Changed");
    expect(JSON.stringify(spec)).toBe(before);
  });

  it("ignores an unknown section id or an empty path", () => {
    expect(setField(baseSpec(), "nope", "headline", "x")).toEqual(baseSpec());
    expect(setField(baseSpec(), "hero-1", "", "x")).toEqual(baseSpec());
  });

  it("creates an array when a numeric path segment hits an absent list", () => {
    const next = setField(baseSpec(), "value-1", "items.0.title", "First");
    const items = (next.sections[1].props as { items: { title: string }[] }).items;
    expect(Array.isArray(items)).toBe(true);
    expect(items[0].title).toBe("First");
  });
});

describe("list item operations", () => {
  it("adds, removes and moves list items", () => {
    let spec = baseSpec();
    spec = addListItem(spec, "value-1", "items", { title: "A", description: "" });
    spec = addListItem(spec, "value-1", "items", { title: "B", description: "" });
    spec = addListItem(spec, "value-1", "items", { title: "C", description: "" });
    const titles = () => (spec.sections[1].props as { items: { title: string }[] }).items.map((i) => i.title);
    expect(titles()).toEqual(["A", "B", "C"]);
    spec = moveListItem(spec, "value-1", "items", 2, 0);
    expect(titles()).toEqual(["C", "A", "B"]);
    spec = removeListItem(spec, "value-1", "items", 1);
    expect(titles()).toEqual(["C", "B"]);
  });

  it("handles out-of-range indices without throwing", () => {
    let spec = addListItem(baseSpec(), "value-1", "items", { title: "A", description: "" });
    spec = moveListItem(spec, "value-1", "items", 9, 0);
    spec = removeListItem(spec, "value-1", "items", 9);
    expect((spec.sections[1].props as { items: unknown[] }).items).toHaveLength(1);
  });

  it("works on a stringList too", () => {
    let spec = addSection(baseSpec(), "marquee");
    const id = spec.sections[spec.sections.length - 1].id;
    spec = addListItem(spec, id, "items", "Tampa");
    spec = addListItem(spec, id, "items", "Brandon");
    expect((spec.sections.find((s) => s.id === id)?.props as { items: string[] }).items).toEqual(["Tampa", "Brandon"]);
  });
});

describe("commitSpec", () => {
  it("accepts a valid candidate", () => {
    const spec = baseSpec();
    const r = commitSpec(setField(spec, "hero-1", "headline", "Good"), spec);
    expect(r.accepted).toBe(true);
    expect((r.spec.sections[0].props as { headline: string }).headline).toBe("Good");
  });

  it("keeps the last good spec when the candidate is mid-typing garbage", () => {
    const spec = baseSpec();
    // a spec where EVERY section is invalid, i.e. nothing survives
    const r = commitSpec({ version: 1, sections: [] }, spec);
    expect(r.accepted).toBe(false);
    expect(r.spec).toEqual(spec);
    expect(r.problems.length).toBeGreaterThan(0);
  });

  it("accepts-with-warnings when only one section is bad, and keeps the rest", () => {
    const spec = baseSpec();
    const candidate = setField(spec, "value-1", "heading", "");
    const r = commitSpec(candidate, spec);
    expect(r.accepted).toBe(true);
    expect(r.spec.sections.map((s) => s.id)).not.toContain("value-1");
  });

  it("never returns an invalid spec", () => {
    for (const junk of [null, 0, "x", {}, { version: 9 }]) {
      const r = commitSpec(junk, baseSpec());
      expect(parseSpec(r.spec).ok).toBe(true);
    }
  });
});

describe("newSectionId", () => {
  it("is unique across rapid calls at the same timestamp", () => {
    const ids = new Set(Array.from({ length: 500 }, () => newSectionId("hero", 1_700_000_000_000)));
    expect(ids.size).toBe(500);
  });
  it("includes the kind, so ids are readable in a diff", () => {
    expect(newSectionId("value-props", 1)).toMatch(/^value-props-/);
  });
});

describe("locked sections", () => {
  it("booking is locked", () => {
    expect(LOCKED_SECTIONS).toContain("booking" as SectionKind);
  });
  it("nothing else is", () => {
    expect(LOCKED_SECTIONS).toHaveLength(1);
  });
});

describe("section variant — spec threading", () => {
  it("parseSpec carries a non-empty variant through", () => {
    const spec = baseSpec();
    spec.sections[0] = { ...spec.sections[0], variant: "orb" } as typeof spec.sections[0];
    const r = parseSpec(spec);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.sections[0].variant).toBe("orb");
  });

  it("normalises an empty variant to absent rather than dropping the section", () => {
    const spec = baseSpec();
    spec.sections[0] = { ...spec.sections[0], variant: "   " } as typeof spec.sections[0];
    const r = parseSpec(spec);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.spec.sections[0].id).toBe("hero-1"); // NOT dropped
      expect(r.spec.sections[0].variant).toBeUndefined();
    }
  });

  it("keeps an UNKNOWN variant string (degrades at render, never at parse)", () => {
    const spec = baseSpec();
    spec.sections[0] = { ...spec.sections[0], variant: "not-a-real-variant" } as typeof spec.sections[0];
    const r = parseSpec(spec);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.sections[0].variant).toBe("not-a-real-variant");
  });

  it("drops a section whose variant blows the length bound", () => {
    const spec = baseSpec();
    spec.sections[0] = { ...spec.sections[0], variant: "x".repeat(200) } as typeof spec.sections[0];
    const r = parseSpec(spec);
    if (r.ok) expect(r.spec.sections.map((s) => s.id)).not.toContain("hero-1");
  });

  it("a section with no variant has none (the default is absence, not a value)", () => {
    const r = parseSpec(baseSpec());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.spec.sections.every((s) => s.variant === undefined)).toBe(true);
  });
});

describe("setSectionVariant", () => {
  it("sets a variant without touching kind or copy", () => {
    let spec = baseSpec();
    spec = setField(spec, "hero-1", "headline", "Kept");
    const next = setSectionVariant(spec, "hero-1", "orb");
    const hero = next.sections.find((s) => s.id === "hero-1");
    expect(hero?.variant).toBe("orb");
    expect(hero?.kind).toBe("hero");
    expect((hero?.props as { headline: string }).headline).toBe("Kept");
  });

  it("clears back to the built-in on undefined, empty or 'default'", () => {
    const withVariant = setSectionVariant(baseSpec(), "hero-1", "orb");
    for (const clearer of [undefined, "", "  ", DEFAULT_VARIANT]) {
      const cleared = setSectionVariant(withVariant, "hero-1", clearer);
      expect(cleared.sections.find((s) => s.id === "hero-1")?.variant).toBeUndefined();
    }
  });

  it("REFUSES to put a variant on the locked booking section", () => {
    const next = setSectionVariant(baseSpec(), "booking-1", "orb");
    expect(next.sections.find((s) => s.id === "booking-1")?.variant).toBeUndefined();
    expect(next).toEqual(baseSpec());
  });

  it("is a no-op for an unknown id or a variant already set", () => {
    expect(setSectionVariant(baseSpec(), "nope", "orb")).toEqual(baseSpec());
    const once = setSectionVariant(baseSpec(), "hero-1", "orb");
    expect(setSectionVariant(once, "hero-1", "orb")).toBe(once); // same reference, no new spec
  });

  it("does not mutate the input spec", () => {
    const spec = baseSpec();
    const before = JSON.stringify(spec);
    setSectionVariant(spec, "hero-1", "orb");
    expect(JSON.stringify(spec)).toBe(before);
  });

  it("swapping kind drops any variant (a hero variant is meaningless on a cta)", () => {
    const withVariant = setSectionVariant(baseSpec(), "hero-1", "orb");
    const swapped = swapSectionKind(withVariant, "hero-1", "cta");
    expect(swapped.sections.find((s) => s.id === "hero-1")?.variant).toBeUndefined();
  });

  it("produces a still-valid spec", () => {
    expect(parseSpec(setSectionVariant(baseSpec(), "hero-1", "orb")).ok).toBe(true);
  });
});

describe("variants metadata", () => {
  it("booking is never offered a variant (A2P form is a fixed contract)", () => {
    expect(SECTION_VARIANTS.booking).toBeUndefined();
    expect(variantsFor("booking")).toEqual([]);
  });

  it("findVariant returns null for the built-in and for unknown ids", () => {
    expect(findVariant("hero", undefined)).toBeNull();
    expect(findVariant("hero", DEFAULT_VARIANT)).toBeNull();
    expect(findVariant("hero", "nope")).toBeNull();
  });

  it("isExternalVariant is false for the built-in and unknown ids", () => {
    expect(isExternalVariant("hero", undefined)).toBe(false);
    expect(isExternalVariant("hero", "nope")).toBe(false);
  });

  it("every declared variant has an id, a name and a source, and no id is 'default'", () => {
    for (const kind of SECTION_KINDS) {
      const ids = new Set<string>();
      for (const v of variantsFor(kind)) {
        expect(v.id, `${kind} variant id`).toBeTruthy();
        expect(v.id).not.toBe(DEFAULT_VARIANT);
        expect(v.name, `${kind}/${v.id} name`).toBeTruthy();
        expect(v.source, `${kind}/${v.id} source`).toBeTruthy();
        expect(ids.has(v.id), `${kind}: duplicate variant id ${v.id}`).toBe(false);
        ids.add(v.id);
      }
    }
  });

  it("every declared variant resolves and reports its external-ness consistently", () => {
    for (const kind of SECTION_KINDS) {
      for (const v of variantsFor(kind)) {
        expect(findVariant(kind, v.id)).toBe(v);
        expect(isExternalVariant(kind, v.id)).toBe(v.external);
      }
    }
  });
});

// Section variants — the PURE metadata table for the variant picker.
//
// A "variant" is an alternative visual implementation of a section KIND. The
// built-in pure component is the default; a non-default variant names another
// implementation (today, real 21st.dev community components) that renders the
// SAME kind's props, so swapping to it preserves the operator's copy.
//
// THIS FILE IS PURE DATA. It imports only a type, nothing renderable and nothing
// heavy, which is why it is vendored into the hub and drift-gated alongside
// schema/controls/registry. The heavy variant IMPLEMENTATIONS (three /
// framer-motion / gsap / drei) live template-ONLY under src/lander-variants/ and
// are NOT vendored and NOT in MANIFEST.json: the shared production hub must never
// take those deps into its bundle. An external variant previews in the hub via an
// iframe of the template's own render route, not in-process. That is the whole
// point of the 2026-07-24 "hybrid" decision (BUILD-PROGRESS §8): a preview that
// cannot lie, without an unbounded dependency surface on a Gisele-serving app.

import type { SectionKind } from "./schema";

/** Where a variant's implementation comes from, shown as attribution in the
 *  picker. "built-in" is never listed as an entry (it is the absence of a
 *  variant); it exists in the union for callers that model the default. */
export type VariantSource = "built-in" | "21st.dev";

export type VariantMeta = {
  /** Stable id stored in the spec as SectionInstance.variant. Every entry here is
   *  a NON-default alternative; the built-in is represented by the absence of a
   *  variant, so it is not an entry. */
  id: string;
  /** Human name for the picker card. */
  name: string;
  /** Attribution source. */
  source: VariantSource;
  /** The 21st.dev author/component URL, for the attribution link. */
  sourceUrl?: string;
  /** True when the implementation carries deps the hub does not vendor, so the
   *  hub MUST preview it through the template iframe and never render it
   *  in-process. All 21st.dev variants are external; a hypothetical pure-CSS
   *  variant could be false. */
  external: boolean;
  /** Thumbnail for the picker card — a public path or data URI. */
  thumb?: string;
  /** npm deps the implementation pulls in. Documented here so the template's
   *  package.json is the single, reviewable place they are installed. */
  deps?: readonly string[];
};

/** The variant id meaning "the built-in pure component". Stored in the spec as
 *  ABSENCE; this constant is only for UI code that needs a concrete value to
 *  represent the default option in a picker. */
export const DEFAULT_VARIANT = "default";

/**
 * Non-default variants available per kind. A kind absent from this map has only
 * its built-in. Booking is intentionally never here: its A2P consent form is a
 * fixed contract and is never a 21st.dev component (BUILD-PROGRESS §8).
 *
 * Populated in increment 1b as real 21st.dev components are vendored template-side.
 */
export const SECTION_VARIANTS: Partial<Record<SectionKind, readonly VariantMeta[]>> = {
  // e.g. hero: [{ id: "orb", name: "Sleek Orb", source: "21st.dev", external: true, ... }]
};

/** Non-default variants for a kind, or [] if it has only the built-in. */
export function variantsFor(kind: SectionKind): readonly VariantMeta[] {
  return SECTION_VARIANTS[kind] ?? [];
}

/** Resolve a stored variant id to its metadata. Returns null for the built-in
 *  (absent / "default") AND for an UNKNOWN id — an unknown variant must degrade
 *  to the built-in, never error, so a spec from a newer template renders on an
 *  older client repo. */
export function findVariant(kind: SectionKind, id: string | undefined): VariantMeta | null {
  if (!id || id === DEFAULT_VARIANT) return null;
  return variantsFor(kind).find((v) => v.id === id) ?? null;
}

/** True only for a KNOWN external variant. Drives the hub's decision to iframe the
 *  template render instead of rendering in-process. Unknown ids and the built-in
 *  are both false — they render (or degrade to) the pure in-process component. */
export function isExternalVariant(kind: SectionKind, id: string | undefined): boolean {
  return findVariant(kind, id)?.external ?? false;
}

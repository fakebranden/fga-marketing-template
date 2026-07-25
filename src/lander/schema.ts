// LanderSpec — the single source of truth for a generated landing page.
//
// Generation writes a spec. Editor controls mutate a spec. The hub preview
// renders a spec. The deployed site renders a spec. Nothing renders from a
// bespoke per-client TSX file, which is what makes instant preview, safe
// publishing and one-click rollback possible: content is DATA.
//
// This file is CANONICAL here in fga-marketing-template and VENDORED into the
// hub by the hub's scripts/sync-sections.mjs. The hub's `check:sections` fails
// the build when the two drift. The spec calls that drift the main engineering
// risk of the project, which is why the copy is hash-verified rather than
// trusted.
//
// Adding a section means: add its schema here, add its controls here, add its
// component to sections.tsx, register it in registry.tsx. The edit UI is
// GENERATED from the control descriptors, so no form code is written by hand.

import { z } from "zod";

// ---------------------------------------------------------------- primitives

// Copy fields are trimmed and length-bounded. The bound is not arbitrary: it is
// what the layouts can actually absorb, and an LLM handed a free-text field will
// happily return three paragraphs for a headline.
const line = (max: number) => z.string().trim().max(max);
const required = (max: number) => z.string().trim().min(1).max(max);

export const ImageRefSchema = z.object({
  src: z.string().trim().max(600),
  alt: line(300).default(""),
  width: z.number().int().positive().max(8000).optional(),
  height: z.number().int().positive().max(8000).optional(),
});
export type ImageRef = z.infer<typeof ImageRefSchema>;

// ------------------------------------------------------------ section schemas

export const HeroSchema = z.object({
  kicker: line(80).default(""),
  headline: required(160),
  lead: line(400).default(""),
  primaryCta: line(40).default("Get started"),
  primaryHref: line(200).default("#book"),
  secondaryCta: line(40).default(""),
  secondaryHref: line(200).default("#book"),
  // "object" is the R3F scene, "image" a supplied still, "none" type-only.
  media: z.enum(["object", "image", "none"]).default("object"),
  image: ImageRefSchema.optional(),
});

export const MarqueeSchema = z.object({
  items: z.array(line(60)).max(24).default([]),
});

export const StatementSchema = z.object({
  text: required(320),
  accentWord: line(60).default(""),
});

export const ValuePropsSchema = z.object({
  kicker: line(80).default(""),
  heading: required(160),
  items: z.array(z.object({
    title: required(120),
    description: line(400).default(""),
  })).max(12).default([]),
});

export const ProcessStepsSchema = z.object({
  kicker: line(80).default(""),
  heading: required(160),
  steps: z.array(z.object({
    step: line(8).default(""),
    title: required(120),
    description: line(400).default(""),
  })).max(10).default([]),
});

export const TestimonialsSchema = z.object({
  heading: required(160),
  items: z.array(z.object({
    quote: required(500),
    author: required(120),
    location: line(120).default(""),
  })).max(12).default([]),
});

export const LogosSchema = z.object({
  label: line(120).default(""),
  items: z.array(line(60)).max(16).default([]),
});

export const FeatureCardsSchema = z.object({
  kicker: line(80).default(""),
  heading: required(160),
  cards: z.array(z.object({
    title: required(120),
    body: line(400).default(""),
    metric: line(40).default(""),
  })).max(9).default([]),
});

export const FaqSchema = z.object({
  kicker: line(80).default(""),
  heading: required(160),
  items: z.array(z.object({
    question: required(240),
    answer: required(1200),
  })).max(20).default([]),
});

export const CtaSchema = z.object({
  kicker: line(80).default(""),
  headline: required(160),
  subtitle: line(400).default(""),
  button: line(40).default("Get started"),
});

// The booking section carries the A2P-compliant form (tel input + SmsConsent).
// Its CONTRACT is fixed: the form itself is never spec-driven, only its framing
// copy, and the section cannot be removed. enforce-a2p.mjs is build-blocking and
// would fail anyway, but failing at edit time is a better experience than
// failing in CI.
export const BookingSchema = z.object({
  kicker: line(80).default(""),
  heading: required(160),
  subtitle: line(400).default(""),
  assurances: z.array(line(120)).max(6).default([]),
});

// ------------------------------------------------------------------- the spec

export const SECTION_KINDS = [
  "hero", "marquee", "statement", "value-props", "process-steps",
  "testimonials", "logos", "feature-cards", "faq", "cta", "booking",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const SECTION_SCHEMAS = {
  hero: HeroSchema,
  marquee: MarqueeSchema,
  statement: StatementSchema,
  "value-props": ValuePropsSchema,
  "process-steps": ProcessStepsSchema,
  testimonials: TestimonialsSchema,
  logos: LogosSchema,
  "feature-cards": FeatureCardsSchema,
  faq: FaqSchema,
  cta: CtaSchema,
  booking: BookingSchema,
} as const;

// A section instance: a stable id (so reordering and inline edits address the
// same node), its kind, and its props. Props are validated against the kind's
// schema by parseSpec, not here, because zod discriminated unions on a record
// this wide produce unusable error messages.
// `kind` is a bounded STRING here, not z.enum(SECTION_KINDS), on purpose. An
// enum would fail the whole document on one unrecognised kind, which is exactly
// the wrong failure mode: a client repo built from an older template must be able
// to receive a spec containing a section it does not have yet and degrade to
// dropping that section, not to a blank page. parseSpec resolves the kind against
// the registry and warns.
export const SectionInstanceSchema = z.object({
  id: z.string().trim().min(1).max(64),
  kind: z.string().trim().min(1).max(64),
  // Optional visual VARIANT: an alternative implementation of the same kind that
  // renders the SAME props, so swapping to it keeps the operator's copy. Absent
  // (or empty) means the built-in pure component. A non-default value names
  // another implementation — today, a real 21st.dev component that carries heavy
  // deps and therefore lives template-only and previews via an iframe, never in
  // the hub bundle (see variants.ts). Kept a bounded STRING, not an enum, for the
  // same forward-compat reason `kind` is: a client repo on an older template must
  // degrade an unrecognised variant to its built-in, never white-screen. An empty
  // string is normalised to absent by parseSpec so a stray "" cannot drop a
  // section.
  variant: z.string().trim().max(120).optional(),
  props: z.record(z.unknown()),
});
export type SectionInstance = {
  id: string;
  kind: SectionKind;
  variant?: string;
  props: Record<string, unknown>;
};

export const LanderSpecSchema = z.object({
  // Bumped only for breaking shape changes; migrateSpec handles the upgrade.
  version: z.literal(1).default(1),
  sections: z.array(SectionInstanceSchema).min(1).max(40),
});
export type LanderSpec = { version: 1; sections: SectionInstance[] };

// -------------------------------------------------------------- parse / repair

export type ParseResult =
  | { ok: true; spec: LanderSpec; warnings: string[] }
  | { ok: false; errors: string[] };

/**
 * Validate a spec end to end: shape, then every section's props against its own
 * schema.
 *
 * Unknown section kinds and individually invalid sections are DROPPED with a
 * warning rather than failing the whole document. That is deliberate: a spec is
 * written on every keystroke and generated by an LLM, so one bad section must
 * not be able to blank a client's page. A spec with no valid sections left is a
 * hard error, because rendering nothing is worse than refusing.
 */
export function parseSpec(input: unknown): ParseResult {
  const outer = LanderSpecSchema.safeParse(input);
  if (!outer.success) {
    return { ok: false, errors: outer.error.issues.map((i) => `${i.path.join(".") || "spec"}: ${i.message}`) };
  }
  const warnings: string[] = [];
  const seen = new Set<string>();
  const sections: SectionInstance[] = [];

  for (const [index, raw] of outer.data.sections.entries()) {
    const schema = SECTION_SCHEMAS[raw.kind as SectionKind];
    if (!schema) {
      warnings.push(`sections[${index}]: unknown kind "${raw.kind}", dropped`);
      continue;
    }
    const parsed = schema.safeParse(raw.props);
    if (!parsed.success) {
      const why = parsed.error.issues.map((i) => `${i.path.join(".") || "props"} ${i.message}`).join("; ");
      warnings.push(`sections[${index}] (${raw.kind}): ${why}, dropped`);
      continue;
    }
    // Duplicate ids would make reordering and inline editing address the wrong
    // node, so they are repaired rather than trusted.
    let id = raw.id;
    if (seen.has(id)) {
      let n = 2;
      while (seen.has(`${id}-${n}`)) n++;
      warnings.push(`sections[${index}]: duplicate id "${id}", renamed to "${id}-${n}"`);
      id = `${id}-${n}`;
    }
    seen.add(id);
    // Carry a non-empty variant through. zod has already trimmed it; an empty
    // string is treated as absent (the built-in) rather than stored, so a section
    // is never dropped over a meaningless variant and the "no variant" state has
    // exactly one representation.
    const section: SectionInstance = { id, kind: raw.kind as SectionKind, props: parsed.data as Record<string, unknown> };
    if (raw.variant) section.variant = raw.variant;
    sections.push(section);
  }

  if (sections.length === 0) return { ok: false, errors: ["no valid sections"] };
  return { ok: true, spec: { version: 1, sections }, warnings };
}

/**
 * Forward-migrate an older spec. Version 1 is the first shape, so there is
 * nothing to migrate yet; the function exists so that call sites are already
 * routed through it when version 2 lands, rather than needing to be found.
 */
export function migrateSpec(input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const spec = input as { version?: unknown };
  if (spec.version === undefined) return { ...spec, version: 1 };
  return spec;
}

// A booking section is mandatory: it carries the A2P consent block, and a lander
// with no conversion point is not a lander.
export function hasBooking(spec: LanderSpec): boolean {
  return spec.sections.some((s) => s.kind === "booking");
}

export function defaultsFor(kind: SectionKind): Record<string, unknown> {
  const schema = SECTION_SCHEMAS[kind];
  // Every optional field carries a .default(), so parsing the minimum viable
  // object yields a complete, renderable section.
  const seed: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(schema.shape as Record<string, z.ZodTypeAny>)) {
    if (def.isOptional?.()) continue;
    seed[key] = PLACEHOLDER[key] ?? "Untitled";
  }
  const parsed = schema.safeParse(seed);
  return parsed.success ? (parsed.data as Record<string, unknown>) : seed;
}

// Placeholders for the required fields of a freshly added section. Visible and
// obviously-unfinished beats lorem ipsum, which ships to production unnoticed.
const PLACEHOLDER: Record<string, string> = {
  headline: "New headline",
  heading: "New section heading",
  text: "New statement",
  title: "New title",
  question: "New question",
  answer: "New answer",
  quote: "New quote",
  author: "Name",
};

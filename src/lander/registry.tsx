"use client";

// The section registry — the one place that knows the full set of sections.
//
// Each entry binds together the four things a section needs to exist: its Zod
// schema (validation), its control descriptors (the generated edit UI), its
// component (rendering), and its label (the picker). Nothing else in either repo
// enumerates sections, so adding one here makes it available to the renderer,
// the editor's controls, the add-section picker, the drag-and-drop canvas and
// the publish path simultaneously.
//
// Vendored into the hub. See schema.ts for why the copy is hash-verified.

import * as React from "react";
import type { ZodTypeAny } from "zod";
import {
  SECTION_KINDS, SECTION_SCHEMAS, type SectionKind, type SectionInstance, type LanderSpec,
} from "./schema";
import { SECTION_CONTROLS, SECTION_LABELS, LOCKED_SECTIONS, type Control } from "./controls";
import {
  HeroSection, MarqueeSection, StatementSection, ValuePropsSection, ProcessStepsSection,
  TestimonialsSection, LogosSection, FeatureCardsSection, FaqSection, CtaSection, BookingSection,
} from "./sections";

/** Slots the HOST supplies, because they cannot live in a portable component:
 *  the R3F hero scene (WebGL, template-only) and the A2P booking form (must stay
 *  server-rendered in one file for the build-blocking check). The hub preview
 *  passes its own stand-ins. */
export type HostSlots = {
  heroObject?: React.ReactNode;
  bookingForm?: React.ReactNode;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyComponent = React.ComponentType<any>;

export type SectionDefinition = {
  kind: SectionKind;
  label: string;
  schema: ZodTypeAny;
  controls: Control[];
  Component: AnyComponent;
  locked: boolean;
  /** Which host slot this section consumes, if any. */
  slot?: keyof HostSlots;
};

const COMPONENTS: Record<SectionKind, AnyComponent> = {
  hero: HeroSection,
  marquee: MarqueeSection,
  statement: StatementSection,
  "value-props": ValuePropsSection,
  "process-steps": ProcessStepsSection,
  testimonials: TestimonialsSection,
  logos: LogosSection,
  "feature-cards": FeatureCardsSection,
  faq: FaqSection,
  cta: CtaSection,
  booking: BookingSection,
};

const SLOTS: Partial<Record<SectionKind, keyof HostSlots>> = {
  hero: "heroObject",
  booking: "bookingForm",
};

export const SECTION_REGISTRY: Record<SectionKind, SectionDefinition> = Object.fromEntries(
  SECTION_KINDS.map((kind): [SectionKind, SectionDefinition] => [kind, {
    kind,
    label: SECTION_LABELS[kind],
    schema: SECTION_SCHEMAS[kind],
    controls: SECTION_CONTROLS[kind],
    Component: COMPONENTS[kind],
    locked: LOCKED_SECTIONS.includes(kind),
    slot: SLOTS[kind],
  }]),
) as Record<SectionKind, SectionDefinition>;

export const REGISTRY_KINDS = SECTION_KINDS;

export function getSection(kind: string): SectionDefinition | null {
  return (SECTION_REGISTRY as Record<string, SectionDefinition>)[kind] ?? null;
}

/**
 * Render one section instance. Unknown kinds render NOTHING rather than throwing:
 * a spec that references a section this build does not have (an older client repo
 * against a newer hub, say) must degrade to a missing section, never to a white
 * screen on a client's live site.
 */
export function RenderSection({ section, slots, editable }: { section: SectionInstance; slots?: HostSlots; editable?: boolean }) {
  const def = getSection(section.kind);
  if (!def) return null;
  const { Component } = def;
  const slotProp = def.slot === "heroObject"
    ? { objectSlot: slots?.heroObject }
    : def.slot === "bookingForm"
      ? { formSlot: slots?.bookingForm }
      : {};
  return <Component {...(section.props as object)} {...slotProp} editable={editable} />;
}

/** Render a whole spec. This is what both the deployed page and the hub preview call. */
export function LanderRenderer({ spec, slots, editable }: { spec: LanderSpec; slots?: HostSlots; editable?: boolean }) {
  return (
    <>
      {spec.sections.map((section) => (
        <div key={section.id} data-section-id={section.id} data-section-kind={section.kind}>
          <RenderSection section={section} slots={slots} editable={editable} />
        </div>
      ))}
    </>
  );
}

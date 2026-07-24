// Control descriptors — what the edit UI is GENERATED from.
//
// The spec is explicit that hand-writing the edit form guarantees rot: someone
// adds a schema field, forgets the form, and the field becomes uneditable
// without anyone noticing. So the editor renders itself from these descriptors,
// and `controlsCoverSchema` (see controls.test.ts) asserts that every schema
// field has one. Adding a field without a control is a TEST FAILURE, not a
// silent gap.

import type { SectionKind } from "./schema";

export type ControlKind =
  | "text"       // single line
  | "textarea"   // multi-line copy
  | "select"     // fixed set of values
  | "toggle"     // boolean
  | "image"      // ImageRef, with an optional generator
  | "stringList" // array of plain strings
  | "itemList";  // array of objects, each with its own fields

export type Control = {
  field: string;
  label: string;
  kind: ControlKind;
  /** Editing hint shown under the input. Not decoration: these are the rules the
   *  copy has to satisfy, and stating them inline is cheaper than a review pass. */
  hint?: string;
  options?: readonly string[];
  /** itemList only: the per-item controls, themselves generated. */
  fields?: Control[];
  /** image only: which generator the "generate" affordance should call. */
  generator?: "higgsfield";
  /** Locked fields render read-only. Used for the A2P booking contract. */
  locked?: boolean;
};

export const SECTION_CONTROLS: Record<SectionKind, Control[]> = {
  hero: [
    { field: "kicker", label: "Kicker", kind: "text", hint: "Short. Company and area read well here." },
    { field: "headline", label: "Headline", kind: "textarea", hint: "Display size steps down as this gets longer, so long is allowed but shorter hits harder." },
    { field: "lead", label: "Lead paragraph", kind: "textarea" },
    { field: "primaryCta", label: "Primary button", kind: "text" },
    { field: "primaryHref", label: "Primary button link", kind: "text", hint: "#book scrolls to the booking form." },
    { field: "secondaryCta", label: "Secondary button", kind: "text", hint: "Leave empty for a single CTA." },
    { field: "secondaryHref", label: "Secondary button link", kind: "text" },
    { field: "media", label: "Hero media", kind: "select", options: ["object", "image", "none"], hint: "object = the animated 3D form. Type never overlaps the media in any of these." },
    { field: "image", label: "Hero image", kind: "image", generator: "higgsfield", hint: "Used only when media is set to image." },
  ],
  marquee: [
    { field: "items", label: "Marquee items", kind: "stringList", hint: "Service areas or short proof points. Scrolls continuously." },
  ],
  statement: [
    { field: "text", label: "Statement", kind: "textarea", hint: "One sentence. This gets pinned and scrubbed on scroll." },
    { field: "accentWord", label: "Emphasised word", kind: "text", hint: "Must appear in the statement to be highlighted." },
  ],
  "value-props": [
    { field: "kicker", label: "Kicker", kind: "text" },
    { field: "heading", label: "Heading", kind: "textarea" },
    {
      field: "items", label: "Value props", kind: "itemList",
      fields: [
        { field: "title", label: "Title", kind: "text" },
        { field: "description", label: "Description", kind: "textarea" },
      ],
    },
  ],
  "process-steps": [
    { field: "kicker", label: "Kicker", kind: "text" },
    { field: "heading", label: "Heading", kind: "textarea" },
    {
      field: "steps", label: "Steps", kind: "itemList",
      fields: [
        { field: "step", label: "Number", kind: "text", hint: "01, 02, 03…" },
        { field: "title", label: "Title", kind: "text" },
        { field: "description", label: "Description", kind: "textarea" },
      ],
    },
  ],
  testimonials: [
    { field: "heading", label: "Heading", kind: "textarea" },
    {
      field: "items", label: "Testimonials", kind: "itemList",
      fields: [
        { field: "quote", label: "Quote", kind: "textarea", hint: "Real quotes only. Never invent a client testimonial." },
        { field: "author", label: "Attributed to", kind: "text" },
        { field: "location", label: "Location", kind: "text" },
      ],
    },
  ],
  logos: [
    { field: "label", label: "Label", kind: "text" },
    { field: "items", label: "Names", kind: "stringList" },
  ],
  "feature-cards": [
    { field: "kicker", label: "Kicker", kind: "text" },
    { field: "heading", label: "Heading", kind: "textarea" },
    {
      field: "cards", label: "Cards", kind: "itemList",
      fields: [
        { field: "title", label: "Title", kind: "text" },
        { field: "body", label: "Body", kind: "textarea" },
        { field: "metric", label: "Metric", kind: "text", hint: "Only a number you can source. Never estimate one." },
      ],
    },
  ],
  faq: [
    { field: "kicker", label: "Kicker", kind: "text" },
    { field: "heading", label: "Heading", kind: "textarea" },
    {
      field: "items", label: "Questions", kind: "itemList",
      fields: [
        { field: "question", label: "Question", kind: "text" },
        { field: "answer", label: "Answer", kind: "textarea", hint: "Also emitted as FAQPage JSON-LD, so keep it self-contained." },
      ],
    },
  ],
  cta: [
    { field: "kicker", label: "Kicker", kind: "text" },
    { field: "headline", label: "Headline", kind: "textarea" },
    { field: "subtitle", label: "Subtitle", kind: "textarea" },
    { field: "button", label: "Button", kind: "text" },
  ],
  booking: [
    { field: "kicker", label: "Kicker", kind: "text" },
    { field: "heading", label: "Heading", kind: "textarea" },
    { field: "subtitle", label: "Subtitle", kind: "textarea" },
    { field: "assurances", label: "Assurances", kind: "stringList", hint: "Short reassurances beside the form." },
  ],
};

/** Sections the operator may not delete. Booking carries the A2P consent block. */
export const LOCKED_SECTIONS: readonly SectionKind[] = ["booking"];

/** Human labels for the add-section picker. */
export const SECTION_LABELS: Record<SectionKind, string> = {
  hero: "Hero",
  marquee: "Scrolling marquee",
  statement: "Pinned statement",
  "value-props": "Value props",
  "process-steps": "Process steps",
  testimonials: "Testimonials",
  logos: "Client names",
  "feature-cards": "Feature cards",
  faq: "FAQ",
  cta: "Closing CTA",
  booking: "Booking form (A2P)",
};

/** Flatten an itemList's nested controls for coverage checks. */
export function controlFields(controls: Control[]): string[] {
  return controls.map((c) => c.field);
}

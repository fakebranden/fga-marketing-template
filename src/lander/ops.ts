// Spec mutation operations.
//
// All three editor modalities (generated controls, click-to-edit on the page,
// drag-and-drop canvas) are INPUT METHODS over these functions. That is the whole
// point of the one-data-model decision: swapping a section, typing in a field and
// dragging a card are the same three operations underneath, so they cannot
// disagree about what the page is.
//
// Every function is pure and returns a new spec. No in-place mutation, so undo is
// just keeping the previous value.

import { parseSpec, defaultsFor, type LanderSpec, type SectionInstance, type SectionKind } from "./schema";
import { LOCKED_SECTIONS } from "./controls";

/** Stable, collision-resistant id without pulling in a uuid dependency. The
 *  counter suffix matters: two sections added in the same millisecond must not
 *  share an id, or reordering addresses the wrong node. */
let seq = 0;
export function newSectionId(kind: string, now = Date.now()): string {
  seq = (seq + 1) % 1_000_000;
  return `${kind}-${now.toString(36)}${seq.toString(36)}`;
}

export function addSection(spec: LanderSpec, kind: SectionKind, atIndex?: number, now?: number): LanderSpec {
  const section: SectionInstance = { id: newSectionId(kind, now), kind, props: defaultsFor(kind) };
  const sections = [...spec.sections];
  const i = atIndex === undefined ? sections.length : clamp(atIndex, 0, sections.length);
  sections.splice(i, 0, section);
  return { ...spec, sections };
}

export function removeSection(spec: LanderSpec, id: string): LanderSpec {
  const target = spec.sections.find((s) => s.id === id);
  // Locked sections (the A2P booking form) are not removable. Refusing here is
  // what stops an operator from shipping a lander with no consent block; the
  // build-blocking check would catch it later, but later is a failed deploy.
  if (!target || LOCKED_SECTIONS.includes(target.kind)) return spec;
  const sections = spec.sections.filter((s) => s.id !== id);
  if (sections.length === 0) return spec;
  return { ...spec, sections };
}

/** Move a section to an absolute index. Used by both the reorder buttons and the
 *  drag-and-drop canvas, so their behaviour cannot diverge. */
export function moveSection(spec: LanderSpec, id: string, toIndex: number): LanderSpec {
  const from = spec.sections.findIndex((s) => s.id === id);
  if (from < 0) return spec;
  const to = clamp(toIndex, 0, spec.sections.length - 1);
  if (to === from) return spec;
  const sections = [...spec.sections];
  const [moved] = sections.splice(from, 1);
  sections.splice(to, 0, moved);
  return { ...spec, sections };
}

/** Swap a section for a different KIND, carrying over any copy whose field name
 *  and shape match. Swapping hero -> cta should not throw away the headline the
 *  operator already wrote. */
export function swapSectionKind(spec: LanderSpec, id: string, kind: SectionKind): LanderSpec {
  const idx = spec.sections.findIndex((s) => s.id === id);
  if (idx < 0) return spec;
  const current = spec.sections[idx];
  if (current.kind === kind) return spec;
  if (LOCKED_SECTIONS.includes(current.kind)) return spec;

  const next = defaultsFor(kind);
  for (const [key, value] of Object.entries(current.props)) {
    if (!(key in next)) continue;
    if (typeof value !== typeof next[key]) continue;
    if (Array.isArray(value) !== Array.isArray(next[key])) continue;
    next[key] = value;
  }
  const sections = [...spec.sections];
  sections[idx] = { id, kind, props: next };
  return { ...spec, sections };
}

/**
 * Set one field by dotted path within a section: "headline", "items.2.title".
 *
 * This is the single write path for the generated controls AND for click-to-edit,
 * which is why inline editing needs no parallel implementation.
 */
export function setField(spec: LanderSpec, id: string, path: string, value: unknown): LanderSpec {
  const idx = spec.sections.findIndex((s) => s.id === id);
  if (idx < 0) return spec;
  const parts = path.split(".").filter(Boolean);
  if (parts.length === 0) return spec;

  const props = writePath(spec.sections[idx].props, parts, value);
  const sections = [...spec.sections];
  sections[idx] = { ...sections[idx], props };
  return { ...spec, sections };
}

/** Append a blank entry to an itemList/stringList field. */
export function addListItem(spec: LanderSpec, id: string, path: string, blank: unknown): LanderSpec {
  const section = spec.sections.find((s) => s.id === id);
  if (!section) return spec;
  const current = readPath(section.props, path.split(".").filter(Boolean));
  const list = Array.isArray(current) ? current : [];
  return setField(spec, id, path, [...list, blank]);
}

export function removeListItem(spec: LanderSpec, id: string, path: string, index: number): LanderSpec {
  const section = spec.sections.find((s) => s.id === id);
  if (!section) return spec;
  const current = readPath(section.props, path.split(".").filter(Boolean));
  if (!Array.isArray(current)) return spec;
  return setField(spec, id, path, current.filter((_, i) => i !== index));
}

export function moveListItem(spec: LanderSpec, id: string, path: string, from: number, to: number): LanderSpec {
  const section = spec.sections.find((s) => s.id === id);
  if (!section) return spec;
  const current = readPath(section.props, path.split(".").filter(Boolean));
  if (!Array.isArray(current)) return spec;
  if (from < 0 || from >= current.length) return spec;
  const next = [...current];
  const [moved] = next.splice(from, 1);
  next.splice(clamp(to, 0, next.length), 0, moved);
  return setField(spec, id, path, next);
}

/**
 * Validate a candidate spec, falling back to the last known-good one.
 *
 * The editor writes on every keystroke, so an intermediate value WILL be invalid
 * (an empty required headline mid-retype, most obviously). Refusing to persist
 * and keeping the previous valid spec is what stops a half-typed state from
 * reaching the draft, per the spec's "an invalid spec is never persisted".
 */
export function commitSpec(candidate: unknown, fallback: LanderSpec): { spec: LanderSpec; accepted: boolean; problems: string[] } {
  const result = parseSpec(candidate);
  if (result.ok) return { spec: result.spec, accepted: true, problems: result.warnings };
  return { spec: fallback, accepted: false, problems: result.errors };
}

// ------------------------------------------------------------------- internals

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function readPath(obj: unknown, parts: string[]): unknown {
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = Array.isArray(cur) ? cur[Number(p)] : (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Immutable deep write. Arrays stay arrays; a numeric segment into a non-array
 *  creates an array, so a path into an absent list still works. */
function writePath(obj: Record<string, unknown>, parts: string[], value: unknown): Record<string, unknown> {
  const [head, ...rest] = parts;
  const out: Record<string, unknown> = { ...obj };
  if (rest.length === 0) {
    out[head] = value;
    return out;
  }
  const child = out[head];
  const nextIsIndex = /^\d+$/.test(rest[0]);
  if (Array.isArray(child)) {
    const arr = [...child];
    const i = Number(rest[0]);
    if (rest.length === 1) {
      arr[i] = value;
    } else {
      const el = arr[i];
      arr[i] = writePath((el && typeof el === "object" ? el : {}) as Record<string, unknown>, rest.slice(1), value);
    }
    out[head] = arr;
    return out;
  }
  if (nextIsIndex) {
    const arr: unknown[] = [];
    const i = Number(rest[0]);
    arr[i] = rest.length === 1 ? value : writePath({}, rest.slice(1), value);
    out[head] = arr;
    return out;
  }
  out[head] = writePath((child && typeof child === "object" ? child : {}) as Record<string, unknown>, rest, value);
  return out;
}

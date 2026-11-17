/**
 * Zod-free analysis types + post-validator. Safe to import on the client
 * (keeps zod out of the browser bundle). `schema.ts` re-exports these and
 * adds the zod schema used server-side for structured output.
 */

export interface AnalysisSubsection {
  id: string; // "a1-s2"
  title: string;
  content: string;
}

export interface AnalysisAccordion {
  id: string; // "a1".."a5"
  title: string;
  subsections: AnalysisSubsection[];
}

export interface UiFocus {
  shouldGoFullScreen: boolean;
  targetAccordion: string | null;
  targetSubsectionId: string | null;
  reason: string | null;
}

export interface Analysis {
  uiFocus: UiFocus;
  accordions: AnalysisAccordion[];
}

export const ACCORDION_COUNT = 5;
export const SUBSECTION_COUNT = 3;
export const EXPECTED_ACCORDION_IDS = Array.from({ length: ACCORDION_COUNT }, (_, i) => `a${i + 1}`);

export type ShapeValidation = { ok: true; value: Analysis } | { ok: false; errors: string[] };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isNonEmptyStr = (v: unknown): v is string => isStr(v) && v.trim().length > 0;
const isNullableStr = (v: unknown): v is string | null => v === null || isStr(v);

/** Structural parse without zod. Collects human-readable path errors. */
function parseStructure(input: unknown): { ok: true; value: Analysis } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(input)) return { ok: false, errors: ["root: expected object"] };

  const f = input.uiFocus;
  if (!isObj(f)) errors.push("uiFocus: expected object");
  else {
    if (typeof f.shouldGoFullScreen !== "boolean") errors.push("uiFocus.shouldGoFullScreen: expected boolean");
    if (!isNullableStr(f.targetAccordion)) errors.push("uiFocus.targetAccordion: expected string|null");
    if (!isNullableStr(f.targetSubsectionId)) errors.push("uiFocus.targetSubsectionId: expected string|null");
    if (!isNullableStr(f.reason)) errors.push("uiFocus.reason: expected string|null");
  }

  const accs = input.accordions;
  if (!Array.isArray(accs)) errors.push("accordions: expected array");
  else {
    accs.forEach((a, i) => {
      if (!isObj(a)) return errors.push(`accordions.${i}: expected object`);
      if (!isStr(a.id)) errors.push(`accordions.${i}.id: expected string`);
      if (!isNonEmptyStr(a.title)) errors.push(`accordions.${i}.title: expected non-empty string`);
      if (!Array.isArray(a.subsections)) return errors.push(`accordions.${i}.subsections: expected array`);
      a.subsections.forEach((s, j) => {
        if (!isObj(s)) return errors.push(`accordions.${i}.subsections.${j}: expected object`);
        if (!isStr(s.id)) errors.push(`accordions.${i}.subsections.${j}.id: expected string`);
        if (!isNonEmptyStr(s.title)) errors.push(`accordions.${i}.subsections.${j}.title: expected non-empty string`);
        if (!isNonEmptyStr(s.content)) errors.push(`accordions.${i}.subsections.${j}.content: expected non-empty string`);
      });
    });
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: input as unknown as Analysis };
}

/**
 * Post-validation (exact 5x3 counts, uiFocus targets exist). Returns a
 * normalised copy with canonical ids so the UI can rely on them.
 */
export function validateAnalysisShape(input: unknown): ShapeValidation {
  const parsed = parseStructure(input);
  if (!parsed.ok) return parsed;
  const a = parsed.value;
  const errors: string[] = [];

  if (a.accordions.length !== ACCORDION_COUNT) {
    errors.push(`expected ${ACCORDION_COUNT} accordions, got ${a.accordions.length}`);
  }
  a.accordions.forEach((acc, i) => {
    if (acc.subsections.length !== SUBSECTION_COUNT) {
      errors.push(`accordion ${i + 1} expected ${SUBSECTION_COUNT} subsections, got ${acc.subsections.length}`);
    }
  });
  if (errors.length) return { ok: false, errors };

  const accordions: AnalysisAccordion[] = a.accordions.map((acc, i) => {
    const accId = `a${i + 1}`;
    return {
      id: accId,
      title: acc.title.trim(),
      subsections: acc.subsections.map((s, j) => ({ id: `${accId}-s${j + 1}`, title: s.title.trim(), content: s.content.trim() })),
    };
  });

  // Map whatever ids the model used -> canonical ids so uiFocus can be resolved.
  const rawToCanonical = new Map<string, string>();
  a.accordions.forEach((acc, i) => {
    rawToCanonical.set(normaliseId(acc.id), `a${i + 1}`);
    acc.subsections.forEach((s, j) => rawToCanonical.set(normaliseId(s.id), `a${i + 1}-s${j + 1}`));
  });

  const focus: UiFocus = { ...a.uiFocus };
  if (focus.shouldGoFullScreen) {
    const sub = focus.targetSubsectionId ? rawToCanonical.get(normaliseId(focus.targetSubsectionId)) : undefined;
    if (!sub || !/^a[1-5]-s[1-3]$/.test(sub)) {
      errors.push(`uiFocus.targetSubsectionId "${focus.targetSubsectionId ?? "null"}" does not exist`);
    } else {
      const derivedAcc = sub.split("-")[0];
      const acc = focus.targetAccordion ? rawToCanonical.get(normaliseId(focus.targetAccordion)) : undefined;
      if (acc && acc !== derivedAcc) {
        errors.push(`uiFocus.targetAccordion "${focus.targetAccordion}" does not contain "${sub}"`);
      }
      focus.targetSubsectionId = sub;
      focus.targetAccordion = derivedAcc;
      focus.reason = focus.reason?.trim() || null;
    }
  } else {
    focus.targetAccordion = null;
    focus.targetSubsectionId = null;
    focus.reason = null;
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { uiFocus: focus, accordions } };
}

function normaliseId(id: string): string {
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Convenience: find a subsection by canonical id. */
export function findSubsection(analysis: Analysis, subsectionId: string) {
  for (const acc of analysis.accordions) {
    const sub = acc.subsections.find((s) => s.id === subsectionId);
    if (sub) return { accordion: acc, subsection: sub };
  }
  return null;
}

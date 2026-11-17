export const MAX_SITUATION_CHARS = 4000;
export const EXPECTED_ACCORDION_COUNT = 5;
export const EXPECTED_SUBSECTION_COUNT = 3;

export type Tier = "free" | "paid";

export interface Subsection {
  id: string;
  title: string;
  content: string;
}

export interface Accordion {
  id: string;
  title: string;
  subsections: Subsection[];
}

export interface UiFocus {
  shouldGoFullScreen: boolean;
  targetAccordion: string | null;
  targetSubsectionId: string | null;
  reason: string | null;
}

export interface Analysis {
  uiFocus: UiFocus;
  accordions: Accordion[];
}

export interface AnalyzeResponse {
  tier: Tier;
  result: Analysis;
}

export type ValidationResult =
  | { ok: true; data: Analysis }
  | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/**
 * Post-validates raw model or vault analysis objects:
 * 1. Enforces exact 5 accordions, each containing exactly 3 subsections.
 * 2. Requires non-empty trimmed `id`, `title`, and `content` on every node.
 * 3. Rejects duplicate accordion IDs or duplicate subsection IDs.
 * 4. Requires `uiFocus` to reference an existing accordion and a subsection inside
 *    that exact accordion when `shouldGoFullScreen === true`; normalizes targets
 *    to `null` when `shouldGoFullScreen === false`.
 */
export function validateAnalysisOutput(candidate: unknown): ValidationResult {
  if (!isRecord(candidate)) {
    return { ok: false, reason: "Analysis must be an object" };
  }

  const rawFocus = candidate.uiFocus;
  const rawAccordions = candidate.accordions;

  if (!isRecord(rawFocus)) {
    return { ok: false, reason: "uiFocus must be an object" };
  }

  if (
    typeof rawFocus.shouldGoFullScreen !== "boolean" ||
    !isNullableString(rawFocus.targetAccordion) ||
    !isNullableString(rawFocus.targetSubsectionId) ||
    !isNullableString(rawFocus.reason)
  ) {
    return { ok: false, reason: "uiFocus fields have invalid types" };
  }

  if (
    !Array.isArray(rawAccordions) ||
    rawAccordions.length !== EXPECTED_ACCORDION_COUNT
  ) {
    return { ok: false, reason: "Analysis must contain exactly 5 accordions" };
  }

  const accordionIds = new Set<string>();
  const subsectionIds = new Set<string>();
  const normalizedAccordions: Accordion[] = [];

  for (const rawAcc of rawAccordions) {
    if (!isRecord(rawAcc)) {
      return { ok: false, reason: "Accordion entry must be an object" };
    }
    if (typeof rawAcc.id !== "string" || typeof rawAcc.title !== "string") {
      return { ok: false, reason: "Accordion id and title must be strings" };
    }

    const accId = rawAcc.id.trim();
    const accTitle = rawAcc.title.trim();
    if (!accId || !accTitle) {
      return { ok: false, reason: "Accordion id or title is blank" };
    }
    if (accordionIds.has(accId)) {
      return { ok: false, reason: "Duplicate accordion id" };
    }
    accordionIds.add(accId);

    if (
      !Array.isArray(rawAcc.subsections) ||
      rawAcc.subsections.length !== EXPECTED_SUBSECTION_COUNT
    ) {
      return { ok: false, reason: "Accordion must contain exactly 3 subsections" };
    }

    const normalizedSubsections: Subsection[] = [];
    for (const rawSub of rawAcc.subsections) {
      if (!isRecord(rawSub)) {
        return { ok: false, reason: "Subsection entry must be an object" };
      }
      if (
        typeof rawSub.id !== "string" ||
        typeof rawSub.title !== "string" ||
        typeof rawSub.content !== "string"
      ) {
        return {
          ok: false,
          reason: "Subsection id, title, and content must be strings",
        };
      }

      const subId = rawSub.id.trim();
      const subTitle = rawSub.title.trim();
      const subContent = rawSub.content.trim();

      if (!subId || !subTitle || !subContent) {
        return { ok: false, reason: "Subsection id, title, or content is blank" };
      }
      if (subsectionIds.has(subId)) {
        return { ok: false, reason: "Duplicate subsection id" };
      }
      subsectionIds.add(subId);

      normalizedSubsections.push({
        id: subId,
        title: subTitle,
        content: subContent,
      });
    }

    normalizedAccordions.push({
      id: accId,
      title: accTitle,
      subsections: normalizedSubsections,
    });
  }

  if (!rawFocus.shouldGoFullScreen) {
    return {
      ok: true,
      data: {
        uiFocus: {
          shouldGoFullScreen: false,
          targetAccordion: null,
          targetSubsectionId: null,
          reason: null,
        },
        accordions: normalizedAccordions,
      },
    };
  }

  const targetAccId = rawFocus.targetAccordion?.trim() ?? "";
  const targetSubId = rawFocus.targetSubsectionId?.trim() ?? "";

  if (!targetAccId || !targetSubId) {
    return {
      ok: false,
      reason: "uiFocus.shouldGoFullScreen is true but target IDs are missing",
    };
  }

  const matchedAccordion = normalizedAccordions.find(
    (acc) => acc.id === targetAccId,
  );
  if (!matchedAccordion) {
    return {
      ok: false,
      reason: "uiFocus.targetAccordion does not match any accordion id",
    };
  }

  const matchedSubsection = matchedAccordion.subsections.find(
    (sub) => sub.id === targetSubId,
  );
  if (!matchedSubsection) {
    return {
      ok: false,
      reason:
        "uiFocus.targetSubsectionId does not match any subsection in targetAccordion",
    };
  }

  const cleanReason =
    rawFocus.reason && rawFocus.reason.trim().length > 0
      ? rawFocus.reason.trim()
      : null;

  return {
    ok: true,
    data: {
      uiFocus: {
        shouldGoFullScreen: true,
        targetAccordion: matchedAccordion.id,
        targetSubsectionId: matchedSubsection.id,
        reason: cleanReason,
      },
      accordions: normalizedAccordions,
    },
  };
}

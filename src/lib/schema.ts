import { z } from "zod";
import type { Analysis } from "@/lib/shape";

/**
 * SERVER-SIDE structured-output contract between the LLM and the app.
 *
 * Provider structured-output modes often do not honour minItems/maxItems, so
 * arrays are unconstrained here and exact shape (5 accordions x 3 subsections,
 * fixed ids, uiFocus targets exist) is enforced in code by
 * `validateAnalysisShape` (see ./shape.ts — zod-free so it can also run in the
 * browser without shipping zod).
 */
export const SubsectionSchema = z.object({
  id: z.string().describe('Fixed id, e.g. "a1-s2"'),
  title: z.string().min(1),
  content: z.string().min(1),
});

export const AccordionSchema = z.object({
  id: z.string().describe('Fixed id "a1".."a5"'),
  title: z.string().min(1),
  subsections: z.array(SubsectionSchema).describe("Exactly 3 subsections"),
});

export const UiFocusSchema = z.object({
  shouldGoFullScreen: z.boolean(),
  targetAccordion: z.string().nullable(),
  targetSubsectionId: z.string().nullable(),
  reason: z.string().nullable().describe("Short, user-visible banner text for the modal"),
});

export const AnalysisSchema = z.object({
  uiFocus: UiFocusSchema,
  accordions: z.array(AccordionSchema).describe("Exactly 5 accordions"),
});

// Compile-time guarantee that the zod schema and the client-safe TS types agree.
type ZodAnalysis = z.infer<typeof AnalysisSchema>;
const _assertSame: [ZodAnalysis extends Analysis ? true : never, Analysis extends ZodAnalysis ? true : never] = [true, true];
void _assertSame;

export {
  validateAnalysisShape,
  findSubsection,
  ACCORDION_COUNT,
  SUBSECTION_COUNT,
  EXPECTED_ACCORDION_IDS,
  type Analysis,
  type AnalysisAccordion,
  type AnalysisSubsection,
  type UiFocus,
  type ShapeValidation,
} from "@/lib/shape";

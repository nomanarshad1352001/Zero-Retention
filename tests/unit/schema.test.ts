import { describe, expect, it } from "vitest";
import { validateAnalysisShape, findSubsection } from "@/lib/schema";
import { buildMockAnalysis } from "@/lib/mock-analysis";

function good() {
  return buildMockAnalysis("a calm situation", "free");
}

describe("validateAnalysisShape", () => {
  it("accepts a well-formed 5x3 analysis", () => {
    const r = validateAnalysisShape(good());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.accordions).toHaveLength(5);
      r.value.accordions.forEach((a, i) => {
        expect(a.id).toBe(`a${i + 1}`);
        expect(a.subsections).toHaveLength(3);
        a.subsections.forEach((s, j) => expect(s.id).toBe(`a${i + 1}-s${j + 1}`));
      });
    }
  });

  it("rejects 4 accordions", () => {
    const a = good();
    a.accordions.pop();
    const r = validateAnalysisShape(a);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/expected 5 accordions/);
  });

  it("rejects an accordion with 2 or 4 subsections", () => {
    const a = good();
    a.accordions[2].subsections.pop();
    expect(validateAnalysisShape(a).ok).toBe(false);
    const b = good();
    b.accordions[4].subsections.push({ id: "a5-s4", title: "x", content: "y" });
    expect(validateAnalysisShape(b).ok).toBe(false);
  });

  it("rejects empty titles/content", () => {
    const a = good();
    a.accordions[0].subsections[0].content = "";
    expect(validateAnalysisShape(a).ok).toBe(false);
  });

  it("canonicalises sloppy ids and resolves uiFocus against them", () => {
    const a = good();
    a.accordions[3].id = "A4";
    a.accordions[3].subsections[0].id = "A4_S1";
    a.uiFocus = { shouldGoFullScreen: true, targetAccordion: "A4", targetSubsectionId: "A4_S1", reason: " Go now " };
    const r = validateAnalysisShape(a);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.uiFocus.targetAccordion).toBe("a4");
      expect(r.value.uiFocus.targetSubsectionId).toBe("a4-s1");
      expect(r.value.uiFocus.reason).toBe("Go now");
      expect(findSubsection(r.value, "a4-s1")?.accordion.id).toBe("a4");
    }
  });

  it("rejects uiFocus pointing at a non-existent subsection", () => {
    const a = good();
    a.uiFocus = { shouldGoFullScreen: true, targetAccordion: "a9", targetSubsectionId: "a9-s9", reason: null };
    const r = validateAnalysisShape(a);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/does not exist/);
  });

  it("rejects uiFocus where accordion does not contain the subsection", () => {
    const a = good();
    a.uiFocus = { shouldGoFullScreen: true, targetAccordion: "a1", targetSubsectionId: "a4-s1", reason: null };
    expect(validateAnalysisShape(a).ok).toBe(false);
  });

  it("nulls out stray targets when shouldGoFullScreen=false", () => {
    const a = good();
    a.uiFocus = { shouldGoFullScreen: false, targetAccordion: "a2", targetSubsectionId: "a2-s2", reason: "nope" };
    const r = validateAnalysisShape(a);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.uiFocus).toEqual({ shouldGoFullScreen: false, targetAccordion: null, targetSubsectionId: null, reason: null });
  });

  it("rejects garbage", () => {
    expect(validateAnalysisShape(null).ok).toBe(false);
    expect(validateAnalysisShape({ accordions: "x" }).ok).toBe(false);
  });
});

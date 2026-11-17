import type { Analysis } from "@/lib/shape";

/**
 * Deterministic, schema-valid analysis used when LLM_PROVIDER=mock.
 * No network, no keys. The situation text is NOT echoed back (only its length
 * and a trigger keyword are inspected) so even the mock path stays content-free.
 *
 * Trigger: including the word "urgent" (or "emergency") in the situation makes
 * the mock set uiFocus.shouldGoFullScreen=true so the modal flow can be tested.
 */
export function buildMockAnalysis(situation: string, tier: "free" | "paid"): Analysis {
  const urgent = /\b(urgent|emergency|immediately|right now)\b/i.test(situation);
  const words = situation.trim().split(/\s+/).filter(Boolean).length;
  const depth = tier === "paid" ? "deeper reasoning model (Pass tier)" : "fast model (free tier)";

  const mk = (a: number, title: string, subs: [string, string][]) => ({
    id: `a${a}`,
    title,
    subsections: subs.map(([t, c], j) => ({ id: `a${a}-s${j + 1}`, title: t, content: c })),
  });

  return {
    uiFocus: urgent
      ? {
          shouldGoFullScreen: true,
          targetAccordion: "a4",
          targetSubsectionId: "a4-s1",
          reason: "This looks time-sensitive. Here is the first thing to do.",
        }
      : { shouldGoFullScreen: false, targetAccordion: null, targetSubsectionId: null, reason: null },
    accordions: [
      mk(1, "What is happening", [
        ["In one sentence", `You described a situation in about ${words} words. This mock analysis was produced by the ${depth} without sending anything to an external API.`],
        ["The core tension", "There is usually one underlying question beneath a situation like this: what outcome matters most to you, and what are you willing to trade for it?"],
        ["What you already know", "You have more context than any model does. Treat the sections below as a structured way to think, not as a verdict."],
      ]),
      mk(2, "Key factors & context", [
        ["People involved", "List everyone affected and what each person likely wants. Misread motives are the most common source of friction."],
        ["Constraints", "Time, money, energy and reputation are finite. Name the one that is tightest right now; it usually dictates the order of your next moves."],
        ["Unknowns", "Write down the two or three facts that would change your decision if you knew them. Those are worth a quick check before acting."],
      ]),
      mk(3, "Options & trade-offs", [
        ["Option A — act now", "Fast, decisive, and often reversible if you keep communication open. Risk: acting on incomplete information."],
        ["Option B — gather first", "Spend a bounded amount of time (say 24–48 hours) confirming the unknowns, then decide. Risk: drift and lost momentum."],
        ["Option C — reframe", "Ask whether the problem as stated is the real problem. Sometimes a small change in framing dissolves the dilemma."],
      ]),
      mk(4, "Suggested next steps", [
        [
          urgent ? "Do this first" : "Step 1",
          urgent
            ? "If anyone's safety is at risk, contact local emergency services now. Then step away from the situation long enough to breathe and reread the rest of this analysis."
            : "Pick the single smallest action that moves you toward clarity today and schedule it.",
        ],
        ["Step 2", "Have one honest conversation with the person most affected. Lead with what you want, not with what went wrong."],
        ["Step 3", "Set a checkpoint—a date on which you will reassess with whatever you learn. Decisions with review points feel lighter."],
      ]),
      mk(5, "Important notes", [
        ["A note on this analysis", "This is informational, not professional advice. For medical, legal, or financial matters, consult a qualified professional."],
        ["Privacy", "Nothing you typed was stored by this app. Closing this tab erases the input, this output, and any pass token."],
        ["Keep a copy", "If you want to keep this, use \"Save to My Phone Vault\" to download an encrypted file that only your passcode can open."],
      ]),
    ],
  };
}

"use client";

import { useCallback, useEffect, useRef } from "react";
import { RotateCcw } from "lucide-react";
import { useSession } from "@/lib/session-store";
import { analyze } from "@/lib/api-client";
import { findSubsection } from "@/lib/shape";
import { SituationInput } from "@/components/SituationInput";
import { LoadingState } from "@/components/LoadingState";
import { ResultsAccordions } from "@/components/ResultsAccordions";
import { FullScreenModal } from "@/components/FullScreenModal";
import { VaultButton } from "@/components/VaultButton";
import { PassCard } from "@/components/PassCard";
import { PrivacyBadge } from "@/components/PrivacyBadge";

/** Single-page orchestrator. All state comes from the in-memory session store. */
export function AnalyzerApp() {
  const { state, dispatch, hasValidPass } = useSession();
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    dispatch({ type: "start" });
    try {
      const { tier, result } = await analyze(state.situation, hasValidPass ? state.token : null, controller.signal);
      if (controller.signal.aborted) return;
      dispatch({ type: "success", result, tier });
    } catch (e) {
      if (controller.signal.aborted) return;
      dispatch({ type: "fail", message: e instanceof Error ? e.message : "Something went wrong." });
    }
  }, [dispatch, hasValidPass, state.situation, state.token]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "cancel" });
  }, [dispatch]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // After the modal closes, bring the target accordion into view.
  const modalWasOpen = useRef(false);
  useEffect(() => {
    if (modalWasOpen.current && !state.modalOpen && state.modalTarget) {
      const el = document.getElementById(`sub-${state.modalTarget}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    modalWasOpen.current = state.modalOpen;
  }, [state.modalOpen, state.modalTarget]);

  const target = state.result && state.modalTarget ? findSubsection(state.result, state.modalTarget) : null;

  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <LoadingState onCancel={cancel} />
      </div>
    );
  }

  if (state.status === "done" && state.result) {
    return (
      <div className="space-y-4 pb-28">
        {state.passNotice ? (
          <p role="status" className="rounded-xl border border-accent/40 bg-accent-soft/50 px-3 py-2 text-sm text-fg" data-testid="pass-notice">
            {state.passNotice}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-fg">Your analysis</h2>
          <span
            className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-fg-muted"
            data-testid="tier-badge"
          >
            {state.tier === "paid" ? "Pass tier" : "Free tier"}
          </span>
        </div>

        <ResultsAccordions
          analysis={state.result}
          expanded={state.expanded}
          onExpandedChange={(ids) => dispatch({ type: "setExpanded", expanded: ids })}
          onOpenSubsection={(id) => dispatch({ type: "openModal", target: id })}
          highlightSubsectionId={state.result.uiFocus.shouldGoFullScreen ? state.result.uiFocus.targetSubsectionId : null}
        />

        <PassCard hasPass={hasValidPass} expiresAt={state.tokenExpiresAt} compact />
        <PrivacyBadge className="w-full justify-center" />

        <FullScreenModal
          open={state.modalOpen}
          onOpenChange={(o) => {
            if (!o) dispatch({ type: "closeModal" });
          }}
          accordion={target?.accordion ?? null}
          subsection={target?.subsection ?? null}
          reason={
            state.result.uiFocus.shouldGoFullScreen && state.result.uiFocus.targetSubsectionId === state.modalTarget
              ? state.result.uiFocus.reason
              : null
          }
        />

        {/* Sticky bottom bar */}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">
            <button type="button" className="btn btn-secondary" onClick={() => dispatch({ type: "reset" })} data-testid="start-over">
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
              <span className="hidden sm:inline">Start over</span>
              <span className="sm:hidden">Reset</span>
            </button>
            <VaultButton enabled={hasValidPass} situation={state.situation} result={state.result} />
          </div>
          {!hasValidPass ? (
            <p className="pb-2 text-center text-xs text-fg-subtle" data-testid="vault-locked-text">
              Vault export: unlock with a pass
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {state.passNotice ? (
        <p role="status" className="rounded-xl border border-accent/40 bg-accent-soft/50 px-3 py-2 text-sm text-fg" data-testid="pass-notice">
          {state.passNotice}
        </p>
      ) : null}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">Think it through, privately.</h1>
        <p className="text-base text-fg-muted">
          Describe a situation and get a calm, structured breakdown in five parts. Nothing you write is saved anywhere.
        </p>
        <PrivacyBadge className="hidden sm:inline-flex" />
      </div>
      <SituationInput
        value={state.situation}
        onChange={(v) => dispatch({ type: "setSituation", situation: v })}
        onSubmit={() => void submit()}
        error={state.status === "error" ? state.errorMessage : null}
      />
      <PassCard hasPass={hasValidPass} expiresAt={state.tokenExpiresAt} />
    </div>
  );
}

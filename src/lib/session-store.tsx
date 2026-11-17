"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Analysis } from "@/lib/shape";
import type { Tier } from "@/lib/models";

/**
 * The ONLY place application state lives: React memory.
 * No localStorage, sessionStorage, IndexedDB, cookies, or Cache API — by design.
 * Refreshing or closing the tab destroys everything, including the pass token.
 */

export type Status = "idle" | "loading" | "done" | "error";

export interface SessionState {
  situation: string;
  status: Status;
  result: Analysis | null;
  tier: Tier | null;
  errorMessage: string | null;
  token: string | null;
  tokenExpiresAt: number | null;
  modalOpen: boolean;
  modalTarget: string | null; // subsection id
  /** Accordion ids that should be expanded (used after the modal closes). */
  expanded: string[];
  passNotice: string | null;
}

export type Action =
  | { type: "setSituation"; situation: string }
  | { type: "start" }
  | { type: "success"; result: Analysis; tier: Tier }
  | { type: "fail"; message: string }
  | { type: "cancel" }
  | { type: "reset" }
  | { type: "setToken"; token: string; expiresAt: number }
  | { type: "clearToken" }
  | { type: "openModal"; target: string }
  | { type: "closeModal" }
  | { type: "setExpanded"; expanded: string[] }
  | { type: "setPassNotice"; message: string | null };

export const initialState: SessionState = {
  situation: "",
  status: "idle",
  result: null,
  tier: null,
  errorMessage: null,
  token: null,
  tokenExpiresAt: null,
  modalOpen: false,
  modalTarget: null,
  expanded: [],
  passNotice: null,
};

export function reducer(state: SessionState, action: Action): SessionState {
  switch (action.type) {
    case "setSituation":
      return { ...state, situation: action.situation };
    case "start":
      return { ...state, status: "loading", errorMessage: null, result: null, modalOpen: false, modalTarget: null, expanded: [] };
    case "success": {
      const focus = action.result.uiFocus;
      const go = focus.shouldGoFullScreen && !!focus.targetSubsectionId;
      return {
        ...state,
        status: "done",
        result: action.result,
        tier: action.tier,
        modalOpen: go,
        modalTarget: go ? focus.targetSubsectionId : null,
        expanded: go && focus.targetAccordion ? [focus.targetAccordion] : ["a1"],
      };
    }
    case "fail":
      return { ...state, status: "error", errorMessage: action.message };
    case "cancel":
      return { ...state, status: "idle", errorMessage: null };
    case "reset":
      // Keep the pass token (it is tied to the tab, not to a single analysis).
      return { ...initialState, token: state.token, tokenExpiresAt: state.tokenExpiresAt };
    case "setToken":
      return { ...state, token: action.token, tokenExpiresAt: action.expiresAt };
    case "clearToken":
      return { ...state, token: null, tokenExpiresAt: null };
    case "openModal":
      return { ...state, modalOpen: true, modalTarget: action.target };
    case "closeModal": {
      const acc = state.modalTarget?.split("-")[0];
      const expanded = acc && !state.expanded.includes(acc) ? [...state.expanded, acc] : state.expanded;
      return { ...state, modalOpen: false, expanded };
    }
    case "setExpanded":
      return { ...state, expanded: action.expanded };
    case "setPassNotice":
      return { ...state, passNotice: action.message };
    default:
      return state;
  }
}

interface SessionContextValue {
  state: SessionState;
  dispatch: React.Dispatch<Action>;
  /** True only if a token exists; expired tokens are cleared automatically by a timer. */
  hasValidPass: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // The effect below clears the token the moment it expires, so presence == validity.
  const hasValidPass = !!state.token && !!state.tokenExpiresAt;

  // Auto-clear the token when it expires so the UI flips back to "free" without a refresh.
  useEffect(() => {
    if (!state.token || !state.tokenExpiresAt) return;
    const ms = state.tokenExpiresAt - Date.now();
    if (ms <= 0) {
      dispatch({ type: "clearToken" });
      return;
    }
    const t = setTimeout(() => dispatch({ type: "clearToken" }), ms);
    return () => clearTimeout(t);
  }, [state.token, state.tokenExpiresAt]);

  // Warn before leaving ONLY when there is something to lose. Nothing is persisted.
  useEffect(() => {
    const hasSomething = !!state.result || !!state.token;
    if (!hasSomething) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore custom text but require returnValue to be set.
      e.returnValue = "Leaving will permanently erase this analysis.";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.result, state.token]);

  const value = useMemo(() => ({ state, dispatch, hasValidPass }), [state, hasValidPass]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

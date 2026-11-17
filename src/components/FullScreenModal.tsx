"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";
import type { AnalysisAccordion, AnalysisSubsection } from "@/lib/shape";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accordion: AnalysisAccordion | null;
  subsection: AnalysisSubsection | null;
  reason?: string | null;
}

/**
 * Full-viewport, focus-trapped dialog (Radix handles aria-modal, focus trap,
 * Esc-to-close and focus return). Opened automatically when uiFocus asks for it.
 */
export function FullScreenModal({ open, onOpenChange, accordion, subsection, reason }: Props) {
  return (
    <Dialog.Root open={open && !!subsection} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-fg/40 backdrop-blur-[2px]" />
        <Dialog.Content
          className="fixed inset-0 z-50 flex flex-col bg-surface focus:outline-none sm:inset-4 sm:mx-auto sm:max-w-2xl sm:rounded-2xl sm:shadow-card"
          data-testid="fullscreen-modal"
          aria-describedby={undefined}
        >
          <header className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-6">
            <div className="min-w-0 flex-1">
              {accordion ? <p className="truncate text-xs font-medium uppercase tracking-wide text-fg-subtle">{accordion.title}</p> : null}
              <Dialog.Title className="mt-0.5 text-xl font-semibold leading-tight text-fg">{subsection?.title ?? ""}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="btn btn-secondary h-11 w-11 shrink-0 rounded-full p-0" aria-label="Close" data-testid="modal-close">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </Dialog.Close>
          </header>

          {reason ? (
            <div role="status" className="flex items-start gap-2 border-b border-warn-border bg-warn-bg px-4 py-3 text-sm text-warn-fg sm:px-6" data-testid="modal-reason">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p>{reason}</p>
            </div>
          ) : null}

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
            <p className="whitespace-pre-line text-lg leading-relaxed text-fg">{subsection?.content ?? ""}</p>
          </div>

          <footer className="border-t border-border px-4 py-3 sm:px-6">
            <Dialog.Close asChild>
              <button type="button" className="btn btn-primary w-full" data-testid="modal-continue">
                Continue to full analysis
              </button>
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

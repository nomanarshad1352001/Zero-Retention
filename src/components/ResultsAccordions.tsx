"use client";

import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Maximize2 } from "lucide-react";
import type { Analysis } from "@/lib/shape";
import { cn } from "@/lib/cn";

interface Props {
  analysis: Analysis;
  expanded: string[];
  onExpandedChange: (ids: string[]) => void;
  onOpenSubsection: (subsectionId: string) => void;
  highlightSubsectionId?: string | null;
}

export function ResultsAccordions({ analysis, expanded, onExpandedChange, onOpenSubsection, highlightSubsectionId }: Props) {
  return (
    <Accordion.Root
      type="multiple"
      value={expanded}
      onValueChange={onExpandedChange}
      className="space-y-3"
      data-testid="results-accordions"
    >
      {analysis.accordions.map((acc, i) => (
        <Accordion.Item key={acc.id} value={acc.id} id={`acc-${acc.id}`} className="card overflow-hidden" data-testid="accordion">
          <Accordion.Header asChild>
            <h3 className="m-0">
              <Accordion.Trigger
                className={cn(
                  "group flex w-full items-center gap-3 px-4 py-3 text-left tap",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-strong"
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span className="flex-1 text-base font-semibold text-fg">{acc.title}</span>
                <ChevronDown
                  className="h-5 w-5 shrink-0 text-fg-subtle transition-transform duration-200 group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </Accordion.Trigger>
            </h3>
          </Accordion.Header>
          <Accordion.Content className="acc-content overflow-hidden">
            <ul className="divide-y divide-border border-t border-border">
              {acc.subsections.map((sub) => {
                const highlighted = highlightSubsectionId === sub.id;
                return (
                  <li
                    key={sub.id}
                    id={`sub-${sub.id}`}
                    data-testid="subsection"
                    className={cn("px-4 py-4", highlighted && "bg-accent-soft/40")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-accent-strong">{sub.title}</h4>
                      <button
                        type="button"
                        onClick={() => onOpenSubsection(sub.id)}
                        className="btn btn-ghost -mr-2 -mt-2 h-9 w-9 min-h-0 min-w-0 rounded-lg p-0"
                        aria-label={`Open "${sub.title}" full screen`}
                        title="Open full screen"
                      >
                        <Maximize2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                    <p className="mt-1 whitespace-pre-line text-base leading-relaxed text-fg">{sub.content}</p>
                  </li>
                );
              })}
            </ul>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  );
}

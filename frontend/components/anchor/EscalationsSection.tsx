"use client";

import { WarningCircle, WarningOctagon, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { AnchorEscalationItem } from "@/types";

interface EscalationsSectionProps {
  items: AnchorEscalationItem[];
  loading: boolean;
}

export function EscalationsSection({
  items,
  loading,
}: EscalationsSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <WarningCircle weight="bold" className="h-5 w-5 text-halqa-ink" />
        <h3 className="text-base font-bold text-halqa-ink">
          Escalated for Review
        </h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-halqa-sand"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-center gap-2 py-8">
          <CheckCircle
            weight="bold"
            className="h-5 w-5 text-halqa-success"
          />
          <p className="text-[13px] text-halqa-ink-light">
            No escalated actions
          </p>
        </div>
      ) : (
        <div>
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 py-3",
                index < items.length - 1 && "border-b border-halqa-sand-mid",
              )}
            >
              <WarningOctagon
                weight="bold"
                className="h-5 w-5 shrink-0 text-amber-500"
              />

              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-halqa-ink">
                  {item.action_summary ?? "No details"}
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wide text-halqa-ink-light">
                  Status: {item.status}
                </p>
              </div>

              <span className="inline-flex shrink-0 items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Central review pending
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

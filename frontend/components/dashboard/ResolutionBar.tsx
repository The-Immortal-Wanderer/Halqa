"use client";

import { cn } from "@/lib/utils";

interface ResolutionBarProps {
  resolved: number;
  total: number;
  className?: string;
}

export function ResolutionBar({
  resolved,
  total,
  className,
}: ResolutionBarProps) {
  if (total === 0) {
    return (
      <div className={cn("", className)}>
        <div className="h-3 w-full rounded-full bg-halqa-sand-dark" />
        <p className="mt-2 text-sm text-halqa-ink-mid text-center">
          No reports in this period.
        </p>
      </div>
    );
  }

  const resolvedPercent = (resolved / total) * 100;

  return (
    <div className={cn("", className)}>
      <div className="h-3 w-full overflow-hidden rounded-full bg-halqa-sand-dark">
        <div
          className="h-full rounded-full bg-halqa-success transition-all"
          style={{ width: `${resolvedPercent}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-halqa-ink-mid">
        {resolved} of {total} reports resolved
      </p>
    </div>
  );
}

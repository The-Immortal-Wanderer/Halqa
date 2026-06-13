"use client";

import { cn } from "@/lib/utils";

interface CategoryBarProps {
  breakdown: Record<string, number>;
  total: number;
  className?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  power: "bg-halqa-cat-power",
  security: "bg-halqa-cat-security",
  infrastructure: "bg-halqa-cat-infrastructure",
  water: "bg-halqa-cat-water",
  general: "bg-halqa-cat-other",
};

const CATEGORY_LABELS: Record<string, string> = {
  power: "Power",
  security: "Security",
  infrastructure: "Infrastructure",
  water: "Water",
  general: "General",
};

export function CategoryBar({
  breakdown,
  total,
  className,
}: CategoryBarProps) {
  const sorted = Object.entries(breakdown)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const hasData = total > 0 && sorted.length > 0;

  const ariaParts = sorted.map(
    ([key, count]) => `${count} ${CATEGORY_LABELS[key] ?? key}`,
  );
  const ariaLabel = hasData
    ? `Alert breakdown: ${ariaParts.join(", ")} over the selected period.`
    : "No alert data for the selected period.";

  return (
    <div className={cn(className)}>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={ariaLabel}
      >
        {hasData ? (
          sorted.map(([key, count]) => {
            const widthPct = (count / total) * 100;
            return (
              <div
                key={key}
                className={cn(
                  "h-full transition-all",
                  CATEGORY_COLORS[key] ?? "bg-halqa-sand-dark",
                )}
                style={{ width: `${widthPct}%` }}
              />
            );
          })
        ) : (
          <div className="h-full w-full rounded-full bg-halqa-sand-dark" />
        )}
      </div>

      {hasData && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {sorted.map(([key, count]) => (
            <div key={key} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-sm",
                  CATEGORY_COLORS[key] ?? "bg-halqa-sand-dark",
                )}
              />
              <span className="text-xs text-halqa-ink-mid">
                {CATEGORY_LABELS[key] ?? key}
              </span>
              <span className="text-xs text-halqa-ink-light">
                ({count})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

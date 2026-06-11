import { cn } from "@/lib/utils";
import type { DashboardPeriod } from "@/types";

interface PeriodSelectorProps {
  value: DashboardPeriod;
  onChange: (period: DashboardPeriod) => void;
  className?: string;
}

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function PeriodSelector({
  value,
  onChange,
  className,
}: PeriodSelectorProps) {
  return (
    <div className={cn("inline-flex rounded-lg bg-halqa-sand p-0.5", className)}>
      {PERIODS.map((period) => (
        <button
          key={period.value}
          onClick={() => onChange(period.value)}
          className={cn(
            "rounded-md px-4 py-1.5 text-xs font-medium transition-colors",
            value === period.value
              ? "bg-white text-halqa-ink shadow-sm"
              : "text-halqa-ink-light hover:text-halqa-ink-mid",
          )}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

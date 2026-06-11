import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  icon,
  className,
}: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-halqa-sand-mid bg-white p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-halqa-ink-light uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-halqa-ink">{value}</p>
          {subtitle ? (
            <p className="mt-1 text-xs text-halqa-ink-light">{subtitle}</p>
          ) : null}
        </div>
        {icon ? (
          <div className="text-halqa-ink-light">{icon}</div>
        ) : null}
      </div>
    </div>
  );
}

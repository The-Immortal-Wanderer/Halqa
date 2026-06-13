"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  trend?: string;
  className?: string;
}

/**
 * Presentational card for displaying a metric label, value,
 * optional icon, and optional trend indicator.
 *
 * Used in the civic dashboard for summary metrics:
 * TOTAL REPORTS, EMERGENCIES, RESOLVED, ACTIVE MEMBERS.
 */
export function MetricCard({
  label,
  value,
  icon,
  trend,
  className,
}: MetricCardProps) {
  const trendColor = trend
    ? trend.startsWith("+")
      ? "text-halqa-success"
      : trend.startsWith("-")
        ? "text-halqa-danger"
        : "text-halqa-ink-light"
    : undefined;

  return (
    <div
      className={cn(
        "rounded-lg border border-halqa-sand-mid bg-white p-4",
        className,
      )}
    >
      {icon ? (
        <div className="mb-2 text-halqa-ink-light">{icon}</div>
      ) : null}
      <p className="text-xs font-medium uppercase tracking-wide text-halqa-ink-light">
        {label}
      </p>
      <p className="mt-1 text-3xl font-bold text-halqa-ink">{value}</p>
      {trend ? (
        <p className={cn("mt-1 text-xs", trendColor)}>{trend}</p>
      ) : null}
    </div>
  );
}

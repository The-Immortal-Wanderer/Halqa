import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 text-halqa-ink-light">{icon}</div>
      ) : null}
      <h3 className="text-base font-semibold text-halqa-ink">{title}</h3>
      {description ? (
        <p className="mt-1 text-sm text-halqa-ink-light max-w-xs">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  tier1: "bg-halqa-sand-mid text-halqa-ink-mid",
  tier2: "bg-halqa-teal-light text-halqa-teal-dark",
  tier3: "bg-halqa-amber-light text-halqa-amber-dark",
  emergency: "bg-halqa-amber text-white",
  success: "bg-halqa-success-bg text-halqa-success",
  danger: "bg-halqa-danger-bg text-halqa-danger",
  default: "bg-halqa-sand-dark text-halqa-ink-mid",
} as const;

interface BadgeProps {
  variant?: keyof typeof VARIANTS;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

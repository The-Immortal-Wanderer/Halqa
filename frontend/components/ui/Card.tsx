import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-halqa-sand-mid bg-white",
        padding && "p-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface OnboardingHeaderProps {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  backDisabled?: boolean;
  rightAction?: React.ReactNode;
  className?: string;
}

export function OnboardingHeader({
  title,
  onBack,
  showBack = true,
  backDisabled = false,
  rightAction,
  className,
}: OnboardingHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between border-b border-halqa-sand-mid bg-white px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={onBack}
            disabled={backDisabled}
            className={cn(
              "flex items-center",
              backDisabled
                ? "cursor-not-allowed text-halqa-sand-dark"
                : "text-halqa-ink-mid hover:text-halqa-ink",
            )}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
        ) : null}
        <h1 className="text-base font-semibold text-halqa-ink">{title}</h1>
      </div>
      {rightAction ? <div>{rightAction}</div> : null}
    </header>
  );
}

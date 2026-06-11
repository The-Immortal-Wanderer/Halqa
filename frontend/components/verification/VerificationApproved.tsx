import { cn } from "@/lib/utils";
import { CheckCircle } from "@phosphor-icons/react";

interface VerificationApprovedProps {
  className?: string;
}

export function VerificationApproved({ className }: VerificationApprovedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <CheckCircle
        size={48}
        className="text-halqa-success"
        weight="fill"
      />
      <h3 className="mt-4 text-base font-semibold text-halqa-ink">
        Address verified
      </h3>
      <p className="mt-2 text-sm text-halqa-ink-light max-w-xs">
        You are now a verified member of your neighborhood.
      </p>
    </div>
  );
}

import { cn } from "@/lib/utils";

interface VerificationPendingProps {
  className?: string;
}

export function VerificationPending({ className }: VerificationPendingProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <div className="mb-6 flex items-center gap-2">
        <div className="h-3 w-3 animate-[halqa-pulse_1.5s_ease-in-out_infinite] rounded-full bg-halqa-amber" />
        <div className="h-3 w-3 animate-[halqa-pulse_1.5s_ease-in-out_0.3s_infinite] rounded-full bg-halqa-amber" />
        <div className="h-3 w-3 animate-[halqa-pulse_1.5s_ease-in-out_0.6s_infinite] rounded-full bg-halqa-amber" />
      </div>
      <h3 className="text-base font-semibold text-halqa-ink">
        Verification in progress
      </h3>
      <p className="mt-2 text-sm text-halqa-ink-light max-w-xs">
        Your document is being reviewed. This usually takes a few minutes.
      </p>
    </div>
  );
}

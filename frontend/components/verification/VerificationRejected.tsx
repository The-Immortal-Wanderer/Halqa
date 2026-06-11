import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { XCircle } from "@phosphor-icons/react";

interface VerificationRejectedProps {
  reason?: string;
  onRetry: () => void;
  className?: string;
}

export function VerificationRejected({
  reason,
  onRetry,
  className,
}: VerificationRejectedProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-4 py-12 text-center",
        className,
      )}
    >
      <XCircle
        size={48}
        className="text-halqa-danger"
        weight="fill"
      />
      <h3 className="mt-4 text-base font-semibold text-halqa-ink">
        Verification failed
      </h3>
      {reason ? (
        <p className="mt-2 text-sm text-halqa-ink-light max-w-xs">{reason}</p>
      ) : (
        <p className="mt-2 text-sm text-halqa-ink-light max-w-xs">
          We could not verify your address with the document you provided.
        </p>
      )}
      <Button onClick={onRetry} className="mt-6">
        Try again
      </Button>
    </div>
  );
}

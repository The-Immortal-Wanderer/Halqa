import { cn } from "@/lib/utils";
import { SealCheck } from "@phosphor-icons/react";

interface WorkerBadgeProps {
  verified?: boolean;
  className?: string;
}

export function WorkerBadge({
  verified = false,
  className,
}: WorkerBadgeProps) {
  if (!verified) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-halqa-success",
        className,
      )}
    >
      <SealCheck size={14} weight="fill" />
      Verified worker
    </span>
  );
}

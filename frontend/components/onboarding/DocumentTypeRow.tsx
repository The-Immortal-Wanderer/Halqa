import { FileText } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface DocumentTypeRowProps {
  label: string;
  description?: string;
  className?: string;
}

export function DocumentTypeRow({
  label,
  description,
  className,
}: DocumentTypeRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-halqa-sand-mid bg-white px-4 py-3",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-halqa-teal-light">
        <FileText size={18} className="text-halqa-teal" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-halqa-ink">{label}</p>
        {description ? (
          <p className="text-xs text-halqa-ink-light">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

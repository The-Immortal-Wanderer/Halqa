import { cn } from "@/lib/utils";
import { ArrowLeft } from "@phosphor-icons/react";

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  showBack = false,
  onBack,
  rightAction,
  className,
}: PageHeaderProps) {
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
            className="flex items-center text-halqa-ink-mid hover:text-halqa-ink"
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

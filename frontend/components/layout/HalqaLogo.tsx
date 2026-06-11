import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
} as const;

interface HalqaLogoProps {
  size?: keyof typeof SIZES;
  showUrdu?: boolean;
  className?: string;
}

export function HalqaLogo({
  size = "md",
  showUrdu = true,
  className,
}: HalqaLogoProps) {
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {/* Mark + Wordmark */}
      <div
        className={cn(
          "flex items-center gap-2 font-bold text-halqa-teal",
          SIZES[size],
        )}
      >
        {/* Simple geometric mark */}
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0"
        >
          <circle cx="20" cy="20" r="18" fill="#1D6A58" />
          <circle cx="20" cy="20" r="8" fill="#F7F4EE" />
        </svg>
        <span>Halqa</span>
      </div>
      {showUrdu ? (
        <span className="mt-1 text-xs font-urdu text-halqa-ink-mid" dir="rtl">
          حلقہ
        </span>
      ) : null}
    </div>
  );
}

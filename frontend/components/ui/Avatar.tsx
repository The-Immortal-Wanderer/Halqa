import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
} as const;

interface AvatarProps {
  src?: string | null;
  alt?: string;
  initials?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({
  src,
  alt = "",
  initials,
  size = "md",
  className,
}: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full object-cover", SIZES[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-halqa-teal-light text-halqa-teal-dark font-medium",
        SIZES[size],
        className,
      )}
      aria-label={alt || initials}
    >
      {initials ? initials.slice(0, 2).toUpperCase() : "?"}
    </div>
  );
}

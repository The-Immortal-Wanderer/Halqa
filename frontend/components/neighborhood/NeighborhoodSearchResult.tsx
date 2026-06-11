import { cn } from "@/lib/utils";
import { MapPin, Users } from "@phosphor-icons/react";
import type { Neighborhood } from "@/types";

interface NeighborhoodSearchResultProps {
  neighborhood: Neighborhood;
  onSelect: () => void;
  className?: string;
}

export function NeighborhoodSearchResult({
  neighborhood,
  onSelect,
  className,
}: NeighborhoodSearchResultProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-halqa-sand-mid px-4 py-3 text-left transition-colors hover:bg-halqa-sand",
        className,
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-halqa-teal-light">
        <MapPin size={18} className="text-halqa-teal" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-halqa-ink truncate">
          {neighborhood.name}
        </p>
        <p className="text-xs text-halqa-ink-light">
          {neighborhood.sector_or_area
            ? `${neighborhood.sector_or_area}, ${neighborhood.city}`
            : neighborhood.city}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 text-xs text-halqa-ink-light">
        <Users size={14} />
        <span>{neighborhood.total_member_count}</span>
      </div>
    </button>
  );
}

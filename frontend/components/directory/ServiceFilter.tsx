"use client";

import { cn } from "@/lib/utils";

interface ServiceFilterProps {
  selected: string | undefined;
  onSelect: (value: string | undefined) => void;
}

const PILLS: { value: string | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "plumber", label: "Plumber" },
  { value: "electrician", label: "Electrician" },
  { value: "maid", label: "Maid" },
  { value: "driver", label: "Driver" },
  { value: "handyman", label: "Handyman" },
  { value: "cook", label: "Cook" },
  { value: "other", label: "Other" },
];

export function ServiceFilter({ selected, onSelect }: ServiceFilterProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide"
      role="tablist"
      aria-label="Filter by service type"
    >
      {PILLS.map((pill) => {
        const isSelected =
          pill.value === undefined
            ? selected === undefined
            : selected === pill.value;

        return (
          <button
            key={pill.label}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(pill.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              isSelected
                ? "bg-halqa-teal text-white"
                : "bg-halqa-sand-mid text-halqa-ink-mid hover:bg-halqa-sand-dark",
            )}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}

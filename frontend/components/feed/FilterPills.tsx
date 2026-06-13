"use client";

import { cn } from "@/lib/utils";
import { WarningCircle } from "@phosphor-icons/react";

interface FilterPillsProps {
  selected: string;
  onSelect: (category: string) => void;
}

interface Pill {
  value: string;
  label: string;
  icon?: React.ElementType;
}

const PILLS: Pill[] = [
  { value: "", label: "All" },
  { value: "emergency", label: "Emergency", icon: WarningCircle },
  { value: "power", label: "Power" },
  { value: "security", label: "Security" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "water", label: "Water" },
  { value: "general", label: "General" },
];

export function FilterPills({ selected, onSelect }: FilterPillsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto px-4 py-2 scrollbar-hide"
      role="tablist"
      aria-label="Filter posts by category"
    >
      {PILLS.map((pill) => {
        const isSelected = selected === pill.value;
        const Icon = pill.icon;

        return (
          <button
            key={pill.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(pill.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
              isSelected && pill.value === "emergency"
                ? "bg-halqa-amber text-white"
                : isSelected
                  ? "bg-halqa-teal text-white"
                  : "bg-halqa-sand-mid text-halqa-ink-mid hover:bg-halqa-sand-dark",
            )}
          >
            {Icon ? (
              <Icon size={14} weight={isSelected ? "fill" : "regular"} />
            ) : null}
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}

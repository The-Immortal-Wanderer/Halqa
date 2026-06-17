"use client";

import { useRouter, useParams } from "next/navigation";
import {
  Drop,
  Lightning,
  Broom,
  Car,
  Wrench,
  CookingPot,
  Briefcase,
  Star,
} from "@phosphor-icons/react";
import type { WorkerListing } from "@/types";

interface WorkerCardProps {
  worker: WorkerListing;
  isLast: boolean;
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  plumber: Drop,
  electrician: Lightning,
  maid: Broom,
  driver: Car,
  handyman: Wrench,
  cook: CookingPot,
  other: Briefcase,
};

function getServiceLabel(st: string): string {
  return st.charAt(0).toUpperCase() + st.slice(1);
}

export function WorkerCard({ worker, isLast }: WorkerCardProps) {
  const router = useRouter();
  const params = useParams();
  const neighborhoodId = params?.neighborhoodId as string;
  const Icon = SERVICE_ICONS[worker.service_type] ?? Briefcase;
  const displayRating = worker.average_rating?.toFixed(1) ?? "0.0";

  return (
    <button
      onClick={() =>
        router.push(
          `/neighborhood/${neighborhoodId}/directory/${worker.id}`
        )
      }
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-halqa-sand-mid/50 ${
        isLast ? "" : "border-b border-halqa-sand-mid"
      }`}
      style={{ minHeight: "72px" }}
    >
      {/* Service type icon */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-halqa-teal-light">
        <Icon size={24} className="text-halqa-teal" weight="fill" />
      </div>

      {/* Name + service type + area */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate font-medium text-halqa-ink"
          style={{ fontSize: "15px" }}
        >
          {worker.name}
        </span>
        <span
          className="text-halqa-ink-mid"
          style={{ fontSize: "13px" }}
        >
          {getServiceLabel(worker.service_type)}
        </span>
        {worker.area_served && (
          <span
            className="truncate text-halqa-ink-light"
            style={{ fontSize: "12px" }}
          >
            {worker.area_served}
          </span>
        )}
      </div>

      {/* Rating */}
      <div className="flex flex-shrink-0 flex-col items-end gap-0.5">
        <div className="flex items-center gap-1">
          <Star size={14} className="text-halqa-amber" weight="fill" />
          <span
            className="font-medium text-halqa-ink"
            style={{ fontSize: "13px" }}
          >
            {displayRating}
          </span>
        </div>
        <span
          className="text-halqa-ink-light"
          style={{ fontSize: "12px" }}
        >
          ({worker.review_count} review{worker.review_count !== 1 ? "s" : ""})
        </span>
      </div>
    </button>
  );
}

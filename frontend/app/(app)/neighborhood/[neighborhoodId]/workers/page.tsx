"use client";

import { useParams } from "next/navigation";
import { Briefcase } from "@phosphor-icons/react";
import { useDirectory } from "@/hooks/useDirectory";
import { WorkerCard } from "@/components/directory/WorkerCard";
import { ServiceFilter } from "@/components/directory/ServiceFilter";

function SkeletonRow() {
  return (
    <div
      className="flex animate-pulse items-center gap-3 px-4"
      style={{ minHeight: "72px" }}
    >
      <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-halqa-sand-mid" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-36 rounded bg-halqa-sand-mid" />
        <div className="h-2.5 w-24 rounded bg-halqa-sand-mid" />
        <div className="h-2 w-28 rounded bg-halqa-sand-mid" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <div className="h-3 w-10 rounded bg-halqa-sand-mid" />
        <div className="h-2.5 w-14 rounded bg-halqa-sand-mid" />
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const params = useParams();
  const neighborhoodId = params?.neighborhoodId as string | undefined;
  const {
    listings,
    total,
    loading,
    error,
    refetch,
    serviceTypeFilter,
    setServiceTypeFilter,
  } = useDirectory(neighborhoodId);

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <h1
          className="font-semibold text-halqa-ink"
          style={{ fontSize: "22px" }}
        >
          Worker Directory
        </h1>
        <p className="mt-1 text-halqa-ink-mid" style={{ fontSize: "15px" }}>
          {total > 0
            ? `${total} service worker${total !== 1 ? "s" : ""} in your area`
            : "Find local service workers"}
        </p>
      </div>

      {/* Service type filter */}
      <ServiceFilter
        selected={serviceTypeFilter}
        onSelect={setServiceTypeFilter}
      />

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-0">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex flex-col items-center gap-3 px-4 py-12">
          <p
            className="text-center text-halqa-ink-mid"
            style={{ fontSize: "13px" }}
          >
            Couldn&apos;t load directory. Try again.
          </p>
          <button
            onClick={refetch}
            className="rounded-lg bg-halqa-teal px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-halqa-teal-dark"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && listings.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-4 py-12">
          <Briefcase size={48} className="text-halqa-sand-dark" />
          <p
            className="text-center text-halqa-ink-mid"
            style={{ fontSize: "13px" }}
          >
            No service workers yet
          </p>
          <p
            className="text-center text-halqa-ink-light"
            style={{ fontSize: "12px" }}
          >
            Check back later for listings in your area
          </p>
        </div>
      )}

      {/* Worker list */}
      {!loading && !error && listings.length > 0 && (
        <div className="flex flex-col">
          {listings.map((worker, index) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              isLast={index === listings.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

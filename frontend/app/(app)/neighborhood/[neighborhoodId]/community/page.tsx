"use client";

import { useParams } from "next/navigation";
import { Users } from "@phosphor-icons/react";
import { useCommunity } from "@/hooks/useCommunity";
import { MemberCard } from "@/components/community/MemberCard";

function SkeletonRow() {
  return (
    <div
      className="flex animate-pulse items-center gap-3 px-4"
      style={{ minHeight: "64px" }}
    >
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-halqa-sand-mid" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-32 rounded bg-halqa-sand-mid" />
        <div className="h-2.5 w-48 rounded bg-halqa-sand-mid" />
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const params = useParams();
  const neighborhoodId = params?.neighborhoodId as string | undefined;
  const { members, total, loading, error, refetch } = useCommunity(neighborhoodId);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <h1
          className="font-semibold text-halqa-ink"
          style={{ fontSize: "22px" }}
        >
          Community
        </h1>
        <p
          className="mt-1 text-halqa-ink-mid"
          style={{ fontSize: "15px" }}
        >
          {total} verified member{total !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col gap-0">
          <SkeletonRow />
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
            Couldn&apos;t load members. Try again.
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
      {!loading && !error && members.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-4 py-12">
          <Users size={48} className="text-halqa-sand-dark" />
          <p
            className="text-center text-halqa-ink-mid"
            style={{ fontSize: "13px" }}
          >
            No verified members yet.
          </p>
        </div>
      )}

      {/* Member list */}
      {!loading && !error && members.length > 0 && (
        <div className="flex flex-col">
          {members.map((member, index) => (
            <MemberCard
              key={member.member_id}
              member={member}
              isLast={index === members.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

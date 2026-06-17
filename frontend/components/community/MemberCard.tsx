"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import type { CommunityMember } from "@/types";

interface MemberCardProps {
  member: CommunityMember;
  isLast: boolean;
}

const TIER_CONFIG: Record<
  string,
  { label: string; badgeClass: string }
> = {
  tier_1: {
    label: "Member",
    badgeClass: "bg-halqa-sand-mid text-halqa-ink-mid",
  },
  tier_2: {
    label: "Verified",
    badgeClass: "bg-halqa-teal-light text-halqa-teal-dark",
  },
  tier_3: {
    label: "Vouched",
    badgeClass: "bg-halqa-teal text-white",
  },
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function formatJoinedDate(iso: string): string {
  const date = new Date(iso);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `Joined ${months[date.getMonth()]} ${date.getFullYear()}`;
}

export function MemberCard({ member, isLast }: MemberCardProps) {
  const tierInfo = TIER_CONFIG[member.tier] ?? TIER_CONFIG.tier_1;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${
        isLast ? "" : "border-b border-halqa-sand-mid"
      }`}
      style={{ minHeight: "64px" }}
    >
      {/* Avatar circle */}
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "#1D6A58" }}
      >
        <span
          className="font-semibold text-white"
          style={{ fontSize: "15px" }}
        >
          {getInitials(member.display_name)}
        </span>
      </div>

      {/* Name + tier + join date */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className="truncate font-medium text-halqa-ink"
          style={{ fontSize: "15px" }}
        >
          {member.display_name}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-tight ${tierInfo.badgeClass}`}
          >
            {tierInfo.label}
          </span>
          <span
            className="text-halqa-ink-light"
            style={{ fontSize: "12px" }}
          >
            {formatJoinedDate(member.joined_at)}
          </span>
        </div>
      </div>

      {/* Anchor badge */}
      {member.is_anchor && (
        <div className="flex flex-shrink-0 items-center gap-1">
          <ShieldCheck
            size={18}
            weight="fill"
            className="text-halqa-teal"
          />
          <span
            className="text-halqa-teal font-medium"
            style={{ fontSize: "12px" }}
          >
            Anchor
          </span>
        </div>
      )}
    </div>
  );
}

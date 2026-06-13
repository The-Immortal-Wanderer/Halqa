"use client";

import { useState } from "react";
import {
  Trash,
  ShieldCheck,
  UserPlus,
  Handshake,
  WarningCircle,
  DotsThree,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { AnchorAuditEntry } from "@/types";

interface AuditLogProps {
  entries: AnchorAuditEntry[];
  loading: boolean;
}

const ACTION_CONFIG: Record<
  string,
  { icon: typeof Trash; color: string; label: string }
> = {
  post_removed: { icon: Trash, color: "text-halqa-danger", label: "Post Removed" },
  dismiss_report: { icon: ShieldCheck, color: "text-halqa-success", label: "Dismiss Report" },
  vouching_initiated: { icon: UserPlus, color: "text-halqa-teal", label: "Vouching Initiated" },
  vouching_completed: { icon: Handshake, color: "text-halqa-success", label: "Vouching Completed" },
  escalation_created: { icon: WarningCircle, color: "text-amber-500", label: "Escalation Created" },
};

function getActionConfig(actionType: string) {
  const configured = ACTION_CONFIG[actionType];
  if (configured) return configured;

  // Fallback: snake_case → Title Case
  const label = actionType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return { icon: DotsThree, color: "text-halqa-ink-light", label };
}

function SkeletonRow() {
  return (
    <div className="flex animate-pulse items-center gap-3 py-1.5">
      <div className="h-4 w-4 rounded-full bg-halqa-sand" />
      <div className="flex-1 space-y-1">
        <div className="h-3 w-1/4 rounded bg-halqa-sand" />
        <div className="h-2.5 w-1/6 rounded bg-halqa-sand" />
      </div>
    </div>
  );
}

export function AuditLog({ entries, loading }: AuditLogProps) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <div className="space-y-1">
      {/* Collapsible header */}
      <button
        onClick={toggle}
        className="flex w-full items-center justify-between rounded-md px-1 py-1.5 transition-colors hover:bg-halqa-sand"
      >
        <span className="text-base font-bold text-halqa-ink">Activity Log</span>
        {expanded ? (
          <CaretUp size={18} className="text-halqa-ink-mid" />
        ) : (
          <CaretDown size={18} className="text-halqa-ink-mid" />
        )}
      </button>

      {/* Content */}
      {!expanded ? null : loading ? (
        <div className="px-1">
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : entries.length === 0 ? (
        <p className="px-1 text-[13px] text-halqa-ink-light">No activity logged yet</p>
      ) : (
        <div className="divide-y divide-halqa-sand-mid/60 px-1">
          {entries.map((entry) => {
            const { icon: Icon, color, label } = getActionConfig(entry.action_type);

            return (
              <div key={entry.id} className="flex items-start gap-3 py-1.5">
                {/* Icon */}
                <div className={cn("mt-0.5 shrink-0", color)}>
                  <Icon size={16} weight="fill" />
                </div>

                {/* Middle: action + timestamp */}
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-halqa-ink">{label}</p>
                  <p className="text-[13px] text-halqa-ink-light">
                    {formatRelativeTime(entry.created_at)}
                  </p>
                </div>

                {/* Right: target post id */}
                {entry.target_post_id ? (
                  <code className="shrink-0 pt-0.5 text-[11px] text-halqa-ink-light">
                    Post:{entry.target_post_id.slice(0, 8)}…
                  </code>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

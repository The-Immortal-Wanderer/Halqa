"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  ShieldCheck,
  WarningCircle,
  Handshake,
  ClockCounterClockwise,
  ListChecks,
  UserPlus,
  CheckCircle,
} from "@phosphor-icons/react";
import { useAnchorStatus } from "@/hooks/useAnchorStatus";
import { anchorApi } from "@/lib/api/anchor";
import type {
  AnchorModerationItem,
  AnchorVouchingRequest,
  AnchorEscalationItem,
  AnchorAuditEntry,
} from "@/types";

export default function AnchorPage() {
  const params = useParams();
  const neighborhoodId = params.neighborhoodId as string;
  const { isAnchor, loading: statusLoading, error: statusError } =
    useAnchorStatus(neighborhoodId);

  const [queue, setQueue] = useState<AnchorModerationItem[]>([]);
  const [vouching, setVouching] = useState<AnchorVouchingRequest[]>([]);
  const [escalations, setEscalations] = useState<AnchorEscalationItem[]>([]);
  const [auditLog, setAuditLog] = useState<AnchorAuditEntry[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("queue");
  const [auditExpanded, setAuditExpanded] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAnchor || !neighborhoodId) {
      setDataLoading(false);
      return;
    }

    const fetchData = async () => {
      setDataLoading(true);
      try {
        const [qRes, vRes, eRes, aRes] = await Promise.all([
          anchorApi.getQueue(neighborhoodId),
          anchorApi.getVouching(neighborhoodId),
          anchorApi.getEscalations(neighborhoodId),
          anchorApi.getAuditLog(neighborhoodId),
        ]);

        if (!qRes.error && qRes.data) setQueue(qRes.data);
        if (!vRes.error && vRes.data) setVouching(vRes.data);
        if (!eRes.error && eRes.data) setEscalations(eRes.data);
        if (!aRes.error && aRes.data) setAuditLog(aRes.data);
      } catch {
        setError("Failed to load anchor data");
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [isAnchor, neighborhoodId]);

  // Loading state
  if (statusLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-halqa-teal-light" />
      </div>
    );
  }

  // Not authorized
  if (statusError || !isAnchor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4">
        <ShieldCheck size={48} className="text-halqa-ink-light" />
        <p className="text-sm font-medium text-halqa-ink">Not authorized</p>
        <p className="text-center text-xs text-halqa-ink-light">
          You are not the anchor of this neighborhood.
        </p>
      </div>
    );
  }

  const TABS = [
    { id: "queue", label: "Queue", icon: ListChecks },
    { id: "vouching", label: "Vouching", icon: UserPlus },
    { id: "escalations", label: "Escalations", icon: WarningCircle },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-halqa-ink">Community Anchor</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-halqa-danger/10 p-3 text-xs text-halqa-danger">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="mb-4 flex gap-2 border-b border-halqa-sand-mid">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 pb-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-halqa-teal text-halqa-teal"
                : "text-halqa-ink-light hover:text-halqa-ink-mid"
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Queue tab */}
      {activeTab === "queue" && (
        <div>
          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg bg-halqa-sand-light"
                />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <CheckCircle size={32} className="text-halqa-success" />
              <p className="text-xs text-halqa-ink-light">
                No reports to review
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  neighborhoodId={neighborhoodId}
                  onResolved={(reportId) =>
                    setQueue((prev) => prev.filter((r) => r.id !== reportId))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vouching tab */}
      {activeTab === "vouching" && (
        <VouchingSection
          requests={vouching}
          loading={dataLoading}
          neighborhoodId={neighborhoodId}
        />
      )}

      {/* Escalations tab */}
      {activeTab === "escalations" && (
        <div>
          {dataLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg bg-halqa-sand-light"
                />
              ))}
            </div>
          ) : escalations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <ShieldCheck size={32} className="text-halqa-success" />
              <p className="text-xs text-halqa-ink-light">
                No escalated actions
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {escalations.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-halqa-sand-mid bg-white p-3"
                >
                  <div className="flex items-start gap-2">
                    <WarningCircle
                      size={16}
                      className="mt-0.5 shrink-0 text-amber-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-halqa-ink">
                        {e.action_summary}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">
                        Central review pending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Audit log (always visible at bottom) */}
      <div className="mt-8">
        <button
          onClick={() => setAuditExpanded(!auditExpanded)}
          className="flex w-full items-center justify-between rounded-lg border border-halqa-sand-mid bg-white px-4 py-3 text-left text-xs font-medium text-halqa-ink"
        >
          <div className="flex items-center gap-2">
            <ClockCounterClockwise size={16} />
            Activity Log
          </div>
          <span className="text-halqa-ink-light">
            {auditExpanded ? "▲" : "▼"}
          </span>
        </button>

        {auditExpanded && (
          <div className="mt-1 space-y-0.5">
            {dataLoading ? (
              <div className="h-16 animate-pulse rounded-lg bg-halqa-sand-light" />
            ) : auditLog.length === 0 ? (
              <p className="py-3 text-center text-xs text-halqa-ink-light">
                No activity logged yet
              </p>
            ) : (
              auditLog.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 border-b border-halqa-sand-mid/50 px-4 py-2 text-xs text-halqa-ink"
                >
                  <ActionIcon actionType={entry.action_type} />
                  <span className="flex-1">
                    {formatActionType(entry.action_type)}
                  </span>
                  {entry.target_post_id && (
                    <span className="text-[10px] text-halqa-ink-light">
                      Post:{entry.target_post_id.slice(0, 8)}...
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components for this page ──────────────────────────────────────

function ModerationCard({
  item,
  neighborhoodId,
  onResolved,
}: {
  item: AnchorModerationItem;
  neighborhoodId: string;
  onResolved: (reportId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setActionLoading(true);
    try {
      const res = await anchorApi.removePost(
        neighborhoodId,
        item.post.id,
        "Removed by anchor review"
      );
      if (!res.error) onResolved(item.id);
    } finally {
      setActionLoading(false);
      setConfirming(false);
    }
  };

  const handleDismiss = async () => {
    setActionLoading(true);
    try {
      const res = await anchorApi.dismissReport(neighborhoodId, item.id);
      if (!res.error) onResolved(item.id);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg border bg-white p-3 ${
        item.post.is_emergency
          ? "border-l-4 border-l-halqa-danger"
          : "border-l-4 border-l-halqa-sand-mid"
      }`}
    >
      <p className="text-xs leading-relaxed text-halqa-ink">
        {item.post.body.slice(0, 120)}
        {item.post.body.length > 120 ? "..." : ""}
      </p>
      <p className="mt-1 text-[11px] text-halqa-ink-light">
        Posted by {item.post.author_display_name || "Unknown"}
      </p>
      <p className="mt-0.5 text-[11px] italic text-halqa-ink-light">
        Reported by {item.reporter_display_name || "Unknown"} — {item.reason}
      </p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={handleRemove}
          disabled={actionLoading}
          className={`rounded-lg px-3 py-1 text-xs font-medium ${
            confirming
              ? "bg-halqa-danger text-white"
              : "bg-halqa-danger/10 text-halqa-danger hover:bg-halqa-danger/20"
          }`}
        >
          {actionLoading
            ? "..."
            : confirming
            ? "Confirm?"
            : "Remove"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={actionLoading}
          className="rounded-lg px-3 py-1 text-xs font-medium text-halqa-teal hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

function VouchingSection({
  requests,
  loading,
  neighborhoodId,
}: {
  requests: AnchorVouchingRequest[];
  loading: boolean;
  neighborhoodId: string;
}) {
  const [memberId, setMemberId] = useState("");
  const [initiating, setInitiating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cosigningId, setCosigningId] = useState<string | null>(null);
  const [localRequests, setLocalRequests] = useState(requests);

  useEffect(() => {
    setLocalRequests(requests);
  }, [requests]);

  const handleInitiate = async () => {
    if (!memberId.trim()) return;
    setInitiating(true);
    try {
      const res = await anchorApi.initiateVouching(neighborhoodId, {
        candidate_member_id: memberId.trim(),
      });
      if (!res.error) {
        setToast("Vouching initiated. Second signature needed.");
        setMemberId("");
        // Refetch
        const vRes = await anchorApi.getVouching(neighborhoodId);
        if (vRes.data) setLocalRequests(vRes.data);
      }
    } finally {
      setInitiating(false);
    }
  };

  const handleCosign = async (requestId: string) => {
    setCosigningId(requestId);
    try {
      const res = await anchorApi.cosignVouching(neighborhoodId, requestId);
      if (!res.error) {
        const vRes = await anchorApi.getVouching(neighborhoodId);
        if (vRes.data) setLocalRequests(vRes.data);
      }
    } finally {
      setCosigningId(null);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-halqa-sand-light"
            />
          ))}
        </div>
      ) : localRequests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <UserPlus size={32} className="text-halqa-ink-light" />
          <p className="text-xs text-halqa-ink-light">
            No pending vouching requests
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {localRequests.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-halqa-sand-mid bg-white p-3"
            >
              <p className="text-sm font-medium text-halqa-ink">
                {r.candidate_display_name || r.candidate_member_id.slice(0, 8)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-halqa-sand-mid">
                  <div
                    className={`h-full rounded-full ${
                      r.cosigner_signed_at
                        ? "bg-halqa-success"
                        : "bg-halqa-teal"
                    }`}
                    style={{
                      width: r.cosigner_signed_at ? "100%" : "50%",
                    }}
                  />
                </div>
                <span className="text-[10px] text-halqa-ink-light">
                  {r.cosigner_signed_at ? "2/2" : "1/2"}
                </span>
              </div>
              {!r.is_completed && !r.is_rejected && !r.cosigner_signed_at && (
                <button
                  onClick={() => handleCosign(r.id)}
                  disabled={cosigningId === r.id}
                  className="mt-2 rounded-lg bg-halqa-teal px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                >
                  {cosigningId === r.id ? "..." : "Co-sign"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Initiate form */}
      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="Member UUID to vouch for..."
          className="flex-1 rounded-lg border border-halqa-sand-mid px-3 py-1.5 text-xs outline-none focus:border-halqa-teal"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInitiate();
          }}
        />
        <button
          onClick={handleInitiate}
          disabled={!memberId.trim() || initiating}
          className="whitespace-nowrap rounded-lg bg-halqa-teal px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {initiating ? "..." : "Initiate"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="mt-3 rounded-lg bg-halqa-teal-light px-3 py-2 text-xs text-halqa-teal-dark">
          <Handshake size={14} className="mr-1 inline" />
          {toast}
        </div>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function ActionIcon({ actionType }: { actionType: string }) {
  const iconSize = 14;
  switch (actionType) {
    case "post_removed":
      return (
        <span className="text-halqa-danger">
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </span>
      );
    case "dismiss_report":
      return <ShieldCheck size={iconSize} className="text-halqa-success" />;
    case "vouching_initiated":
      return <UserPlus size={iconSize} className="text-halqa-teal" />;
    case "vouching_completed":
      return <Handshake size={iconSize} className="text-halqa-success" />;
    default:
      return <ListChecks size={iconSize} className="text-halqa-ink-light" />;
  }
}

function formatActionType(actionType: string): string {
  return actionType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

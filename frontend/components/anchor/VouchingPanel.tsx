"use client";

import { useState, useEffect } from "react";
import { Handshake, UserPlus, X, CheckCircle } from "@phosphor-icons/react";
import { cn, formatDate } from "@/lib/utils";
import type { AnchorVouchingRequest } from "@/types";

interface VouchingPanelProps {
  requests: AnchorVouchingRequest[];
  loading: boolean;
  neighborhoodId: string;
  onCosign: (requestId: string) => void;
  onInitiateVouching: (memberId: string) => void;
}

function formatExpiry(isoString: string): string {
  const expires = new Date(isoString);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return "expired";
  if (diffHours < 1) return "expiring soon";
  if (diffHours < 24) return `in ${diffHours}h`;
  if (diffDays < 30) return `in ${diffDays}d`;
  return formatDate(isoString);
}

function getProgressState(request: AnchorVouchingRequest) {
  const hasAnchor = !!request.anchor_signed_at;
  const hasCosigner = !!request.cosigner_signed_at;

  if (request.is_completed) return { pct: 100, color: "bg-halqa-success" };
  if (hasCosigner) return { pct: 100, color: "bg-halqa-success" };
  if (hasAnchor) return { pct: 50, color: "bg-halqa-teal" };

  // Check expiry proximity
  const expires = new Date(request.expires_at);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  const diffHours = diffMs / 3_600_000;
  const color = diffHours < 24 ? "bg-halqa-danger" : "bg-halqa-teal";

  return { pct: 0, color };
}

function SkeletonRow() {
  return (
    <div className="mb-2 animate-pulse rounded-lg border border-halqa-sand-mid bg-white p-3">
      <div className="mb-2 h-4 w-2/5 rounded bg-halqa-sand" />
      <div className="mb-2 h-2 w-1/3 rounded bg-halqa-sand" />
      <div className="mb-2 h-2 rounded-full bg-halqa-sand" />
      <div className="h-3 w-1/4 rounded bg-halqa-sand" />
    </div>
  );
}

export function VouchingPanel({
  requests,
  loading,
  neighborhoodId: _neighborhoodId,
  onCosign,
  onInitiateVouching,
}: VouchingPanelProps) {
  const [memberId, setMemberId] = useState("");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [initiating, setInitiating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleCosign = async (requestId: string) => {
    setSubmitting(requestId);
    try {
      await onCosign(requestId);
    } finally {
      setSubmitting(null);
    }
  };

  const handleInitiate = () => {
    const trimmed = memberId.trim();
    if (!trimmed) return;
    setInitiating(true);
    try {
      onInitiateVouching(trimmed);
      setMemberId("");
      setToast("Vouching initiated — second signature needed");
    } finally {
      setInitiating(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Handshake size={18} weight="fill" className="text-halqa-teal" />
        <h3 className="text-base font-bold text-halqa-ink">Vouching Requests</h3>
      </div>

      {/* Loading state */}
      {loading ? (
        <>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </>
      ) : requests.length === 0 ? (
        /* Empty state */
        <div className="flex items-center gap-2 py-4">
          <UserPlus size={16} className="text-halqa-ink-light" />
          <span className="text-[13px] text-halqa-ink-light">
            No pending vouching requests
          </span>
        </div>
      ) : (
        /* Request cards */
        requests.map((req) => {
          const { pct, color } = getProgressState(req);
          const signatureCount = [req.anchor_signed_at, req.cosigner_signed_at].filter(Boolean).length;

          return (
            <div
              key={req.id}
              className="rounded-lg border border-halqa-sand-mid bg-white p-3"
            >
              {/* Candidate name */}
              <p className="text-sm font-bold text-halqa-ink">
                {req.candidate_display_name ?? "Unknown member"}
              </p>

              {/* Progress indicator */}
              <div className="mt-2">
                <span className="text-[13px] text-halqa-ink-mid">
                  Signatures: {signatureCount} of 2
                </span>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-halqa-sand">
                  <div
                    className={cn("h-full rounded-full transition-all duration-300", color)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Status line */}
              <p className="mt-1 text-[13px] text-halqa-ink-light">
                Expires {formatExpiry(req.expires_at)}
              </p>

              {/* Action area */}
              <div className="mt-2">
                {req.is_completed ? (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-halqa-success">
                    <CheckCircle size={14} weight="fill" />
                    Completed
                  </span>
                ) : req.is_rejected ? (
                  <span className="inline-flex items-center gap-1 text-[13px] font-medium text-halqa-danger">
                    <X size={14} weight="bold" />
                    Rejected
                  </span>
                ) : (
                  /* Co-sign button — only show when anchor signature exists but cosigner is missing */
                  req.anchor_signed_at && !req.cosigner_signed_at ? (
                    <button
                      onClick={() => handleCosign(req.id)}
                      disabled={submitting === req.id}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[13px] text-white transition-colors",
                        submitting === req.id
                          ? "cursor-not-allowed bg-halqa-teal/60"
                          : "bg-halqa-teal hover:bg-halqa-teal-dark",
                      )}
                    >
                      {submitting === req.id ? (
                        <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-white/60" />
                      ) : (
                        <Handshake size={14} />
                      )}
                      Co-sign
                    </button>
                  ) : null
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Initiate vouching form */}
      <div className="flex items-center gap-2 pt-2">
        <input
          type="text"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          placeholder="Member UUID to vouch for"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInitiate();
          }}
          className="w-60 rounded-md border border-halqa-sand-dark bg-white px-3 py-1.5 text-[13px] text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
        />
        <button
          onClick={handleInitiate}
          disabled={initiating || !memberId.trim()}
          className={cn(
            "rounded-lg px-4 py-1.5 text-[13px] text-white transition-colors",
            initiating || !memberId.trim()
              ? "cursor-not-allowed bg-halqa-teal/60"
              : "bg-halqa-teal hover:bg-halqa-teal-dark",
          )}
        >
          Initiate
        </button>
      </div>

      {/* Success toast */}
      {toast ? (
        <div className="rounded-md bg-halqa-success-bg px-3 py-2 text-[13px] text-halqa-success transition-opacity">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

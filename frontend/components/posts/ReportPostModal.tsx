"use client";

import { useState } from "react";
import { X, Flag } from "@phosphor-icons/react";
import { anchorApi } from "@/lib/api/anchor";

interface ReportPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  neighborhoodId: string;
}

export function ReportPostModal({
  isOpen,
  onClose,
  postId,
  neighborhoodId,
}: ReportPostModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await anchorApi.reportPost(neighborhoodId, postId, {
        reason: reason.trim(),
      });
      if (res.error) {
        setError(res.error.message);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        {submitted ? (
          <>
            <div className="flex flex-col items-center gap-3 py-4">
              <Flag size={32} className="text-halqa-teal" weight="fill" />
              <p className="text-sm font-medium text-halqa-ink">
                Report submitted
              </p>
              <p className="text-center text-xs text-halqa-ink-light">
                The anchor will review this report.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-halqa-teal py-2 text-sm font-medium text-white"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-halqa-ink">
                Why are you reporting this post?
              </h3>
              <button onClick={onClose} className="text-halqa-ink-light">
                <X size={18} />
              </button>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="Describe why this post needs review..."
              rows={3}
              className="mt-3 w-full resize-none rounded-lg border border-halqa-sand-mid p-2 text-xs leading-relaxed text-halqa-ink outline-none focus:border-halqa-teal"
            />
            <p className="mt-1 text-right text-[10px] text-halqa-ink-light">
              {reason.length}/300
            </p>

            {error && (
              <p className="mt-1 text-xs text-halqa-danger">{error}</p>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-halqa-sand-mid py-2 text-xs font-medium text-halqa-ink"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason.trim() || submitting}
                className="flex-1 rounded-lg bg-halqa-teal py-2 text-xs font-medium text-white disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

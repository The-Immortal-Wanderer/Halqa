"use client";

import { useState } from "react";
import { X, Check } from "@phosphor-icons/react";
import { cn, truncate } from "@/lib/utils";
import type { AnchorModerationItem } from "@/types";

interface ModerationQueueItemProps {
  item: AnchorModerationItem;
  onRemove: (postId: string, reason: string) => void;
  onDismiss: (reportId: string) => void;
  neighborhoodId: string;
}

export function ModerationQueueItem({
  item,
  onRemove,
  onDismiss,
}: ModerationQueueItemProps) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const handleRemove = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setRemoving(true);
    onRemove(item.post.id, item.reason);
  };

  const handleDismiss = () => {
    setConfirming(false);
    setDismissing(true);
    onDismiss(item.id);
  };

  const body = truncate(item.post.body ?? "", 120);

  return (
    <div
      className={cn(
        "rounded-lg border border-halqa-sand-mid bg-white p-4",
        "border-l-4",
        item.post.is_emergency
          ? "border-l-halqa-danger"
          : "border-l-halqa-sand-mid",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-halqa-ink">{body}</p>
          <p className="mt-1 text-xs text-halqa-ink-light">
            Posted by {item.post.author_display_name ?? "Unknown"}
          </p>
          <p className="mt-0.5 text-xs italic text-halqa-ink-mid">
            Reported by {item.reporter_display_name ?? "Unknown"} —{" "}
            {item.reason}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "bg-halqa-danger/10 text-halqa-danger hover:bg-halqa-danger/20",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {removing ? (
              <PulseRing />
            ) : confirming ? (
              "Confirm?"
            ) : (
              <>
                <X weight="bold" className="h-3.5 w-3.5" />
                Remove
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              "bg-transparent text-halqa-teal hover:underline",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {dismissing ? (
              <PulseRing />
            ) : (
              <>
                <Check weight="bold" className="h-3.5 w-3.5" />
                Dismiss
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PulseRing() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

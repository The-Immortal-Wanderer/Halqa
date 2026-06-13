"use client";

import { useCallback, useEffect, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react";
import { cn, formatRelativeTime, truncate } from "@/lib/utils";
import { apiFetch } from "@/lib/api/client";
import type { Post } from "@/types";

interface RecentEmergencyListProps {
  neighborhoodId: string;
  className?: string;
}

export function RecentEmergencyList({
  neighborhoodId,
  className,
}: RecentEmergencyListProps) {
  const [emergencies, setEmergencies] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmergencies = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiFetch<Post[]>(
      `/neighborhoods/${neighborhoodId}/alerts?limit=5&include_resolved=false`,
    );
    if (result.error) {
      setError(result.error.message);
    } else {
      setEmergencies(result.data ?? []);
    }
    setLoading(false);
  }, [neighborhoodId]);

  useEffect(() => {
    fetchEmergencies();
  }, [fetchEmergencies]);

  // Loading skeleton: 3 pulsing rows
  if (loading) {
    return (
      <div className={cn("space-y-0", className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex gap-3 items-start py-3 border-b border-halqa-sand-mid last:border-b-0"
          >
            <div className="h-5 w-5 rounded-full bg-halqa-sand-mid animate-pulse shrink-0 mt-0.5" />
            <div className="flex-1 h-12 bg-halqa-sand-mid rounded animate-pulse" />
            <div className="w-12 h-4 bg-halqa-sand-mid rounded animate-pulse shrink-0 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("text-sm text-halqa-danger", className)}>{error}</div>
    );
  }

  // Empty state: no emergencies
  if (emergencies.length === 0) {
    return (
      <div className={cn("flex flex-col items-center py-8 gap-2", className)}>
        <CheckCircle size={32} className="text-halqa-success" />
        <p className="text-sm text-halqa-ink-mid text-center">
          No active emergencies. Your neighborhood is quiet.
        </p>
      </div>
    );
  }

  // List of emergencies
  return (
    <div className={cn("divide-y divide-halqa-sand-mid", className)}>
      {emergencies.map((post) => {
        const bodyText = post.body || post.content || "";
        const truncated = truncate(bodyText, 60);
        const timeAgo = formatRelativeTime(post.created_at);

        return (
          <div
            key={post.id}
            className="flex gap-3 items-start py-3 first:pt-0 last:pb-0"
          >
            {post.is_resolved ? (
              <CheckCircle
                size={20}
                className="text-halqa-success shrink-0 mt-0.5"
              />
            ) : (
              <WarningCircle
                size={20}
                className="text-halqa-amber shrink-0 mt-0.5"
              />
            )}
            <span
              className={cn(
                "flex-1 text-sm",
                post.is_resolved
                  ? "text-halqa-ink-light line-through"
                  : "text-halqa-ink",
              )}
            >
              {truncated}
            </span>
            <span className="text-xs text-halqa-ink-light shrink-0">
              {timeAgo}
            </span>
          </div>
        );
      })}
    </div>
  );
}

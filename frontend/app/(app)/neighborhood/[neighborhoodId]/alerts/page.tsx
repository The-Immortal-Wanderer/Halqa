"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { apiFetch } from "@/lib/api/client";
import { PostCard } from "@/components/feed/PostCard";
import type { Post } from "@/types";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-halqa-sand-mid bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="h-5 w-20 rounded-full bg-halqa-sand-mid" />
        <div className="h-3 w-12 rounded bg-halqa-sand-mid" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full rounded bg-halqa-sand-mid" />
        <div className="h-3 w-3/4 rounded bg-halqa-sand-mid" />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-halqa-sand-mid" />
        <div className="h-3 w-24 rounded bg-halqa-sand-mid" />
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const params = useParams();
  const neighborhoodId = params.neighborhoodId as string;

  const [alerts, setAlerts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ posts: Post[] }>(
        `/neighborhoods/${neighborhoodId}/alerts`,
      );
      if (res.error) {
        setError(res.error.message);
      } else if (res.data) {
        setAlerts(res.data.posts ?? []);
      }
    } catch {
      setError("Failed to load alerts. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (neighborhoodId) fetchAlerts();
  }, [neighborhoodId]);

  return (
    <div>
      {/* Page header */}
      <div className="border-b border-halqa-sand-mid px-4 pb-3 pt-4">
        <h1 className="text-[22px] font-semibold text-halqa-ink">
          Emergency Alerts
        </h1>
        <p className="mt-0.5 text-[15px] text-halqa-ink-light">
          {alerts.length > 0
            ? `${alerts.length} active ${alerts.length === 1 ? "alert" : "alerts"}`
            : "No active alerts"}
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {/* Error state */}
      {!loading && error ? (
        <div className="px-4 py-12 text-center">
          <WarningCircle size={40} className="mx-auto text-halqa-danger" />
          <p className="mt-2 text-sm text-halqa-ink-light">{error}</p>
          <button
            onClick={fetchAlerts}
            className="mt-4 rounded-lg bg-halqa-teal px-6 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && !error && alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
          <CheckCircle size={48} className="text-halqa-success" />
          <p className="mt-4 text-[13px] text-halqa-ink-light">
            No active emergencies. Your neighborhood is quiet.
          </p>
        </div>
      ) : null}

      {/* Alerts list */}
      {!loading && !error && alerts.length > 0 ? (
        <div className="flex flex-col gap-4 px-4 pb-4 pt-4">
          {alerts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              neighborhoodId={neighborhoodId}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

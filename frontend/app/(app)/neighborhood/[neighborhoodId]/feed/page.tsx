"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ShieldCheck, PencilSimple } from "@phosphor-icons/react";
import { useParams, useRouter } from "next/navigation";
import { verificationApi } from "@/lib/api/verification";
import { neighborhoodsApi } from "@/lib/api/neighborhoods";
import { useFeed } from "@/hooks/useFeed";
import { FilterPills } from "@/components/feed/FilterPills";
import { FeedList } from "@/components/feed/FeedList";
import { EmergencyBanner } from "@/components/feed/EmergencyBanner";
import { PostCreationSheet } from "@/components/feed/PostCreationSheet";
import type { VerificationStatusData, Post } from "@/types";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  const params = useParams();
  const router = useRouter();
  const neighborhoodId = params.neighborhoodId as string;
  const [tier, setTier] = useState<number | "loading">("loading");
  const [filterCategory, setFilterCategory] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [neighborhoodName, setNeighborhoodName] = useState<string | null>(null);

  const { posts, loading, error, activeEmergency, clearEmergency } = useFeed(
    neighborhoodId,
    filterCategory,
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await verificationApi.getStatus();
        if (res.data?.status === "approved") {
          setTier(2);
        } else {
          setTier(1);
        }
      } catch {
        setTier(1);
      }
    }
    load();
  }, []);

  useEffect(() => {
    neighborhoodsApi.getById(neighborhoodId).then((res) => {
      if (res.data?.name) setNeighborhoodName(res.data.name);
    });
  }, [neighborhoodId]);

  const showTier1Banner = tier === 1;
  const canPost = tier !== 1 && tier !== "loading";

  const handlePostTap = useCallback((post: Post) => {
    router.push(`/neighborhood/${neighborhoodId}/posts/${post.id}`);
  }, [router, neighborhoodId]);

  const handlePostCreated = useCallback((_post: Post) => {
    setShowSheet(false);
  }, []);

  return (
    <div>
      {/* Emergency banner */}
      {activeEmergency ? (
        <EmergencyBanner
          post={activeEmergency}
          onDismiss={clearEmergency}
          onTap={activeEmergency ? () => handlePostTap(activeEmergency) : undefined}
        />
      ) : null}

      {/* Tier 1 banner */}
      {showTier1Banner ? (
        <div className="flex items-center gap-3 bg-halqa-amber-light px-4 py-3">
          <ShieldCheck size={20} className="shrink-0 text-halqa-amber-dark" />
          <p className="flex-1 text-sm text-halqa-amber-dark">
            You&apos;re browsing as an unverified member. Verify your address
            to post and interact.
          </p>
          <Link
            href="/verify/upload"
            className="shrink-0 text-sm font-semibold text-halqa-amber-dark underline"
          >
            Verify now &rarr;
          </Link>
        </div>
      ) : null}

      {/* Filter pills */}
      <FilterPills selected={filterCategory} onSelect={setFilterCategory} />

      {/* Error state */}
      {error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-halqa-danger">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm font-semibold text-halqa-teal underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <FeedList
          posts={posts}
          onPostTap={handlePostTap}
          loading={loading}
          neighborhoodId={neighborhoodId}
        />
      )}

      {/* FAB — visible only for Tier 2+ */}
      {canPost ? (
        <button
          onClick={() => setShowSheet(true)}
          aria-label="Create a post"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-halqa-teal text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          <PencilSimple size={24} weight="fill" />
        </button>
      ) : null}

      {/* Post creation sheet */}
      <PostCreationSheet
        open={showSheet}
        onClose={() => setShowSheet(false)}
        neighborhoodId={neighborhoodId}
        neighborhoodName={neighborhoodName ?? "your neighborhood"}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}

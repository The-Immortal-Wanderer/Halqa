"use client";

import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { HouseLine } from "@phosphor-icons/react";
import type { Post } from "@/types";

interface FeedListProps {
  posts: Post[];
  onPostTap?: (post: Post) => void;
  loading?: boolean;
}

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

export function FeedList({
  posts,
  onPostTap,
  loading = false,
}: FeedListProps) {
  if (loading && posts.length === 0) {
    return (
      <div className="flex flex-col gap-4 px-4 pb-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={<HouseLine size={40} />}
        title="No posts yet"
        description="Be the first to share something with your neighborhood"
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onTap={onPostTap ? () => onPostTap(post) : undefined}
        />
      ))}
    </div>
  );
}

import { PostCard } from "@/components/feed/PostCard";
import { EmergencyPostCard } from "@/components/feed/EmergencyPostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { Post } from "@/types";

interface FeedListProps {
  posts: Post[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function FeedList({
  posts,
  loading = false,
  emptyTitle = "No posts yet",
  emptyDescription = "Be the first to share something in your neighborhood.",
}: FeedListProps) {
  if (loading) {
    return <LoadingSpinner className="py-12" />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="space-y-3 px-4 pb-4">
      {posts.map((post) =>
        post.is_emergency ? (
          <EmergencyPostCard key={post.id} post={post} />
        ) : (
          <PostCard key={post.id} post={post} />
        ),
      )}
    </div>
  );
}

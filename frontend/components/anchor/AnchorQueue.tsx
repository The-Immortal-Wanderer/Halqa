import { EmptyState } from "@/components/ui/EmptyState";
import { ModerationCard } from "@/components/anchor/ModerationCard";
import type { Post } from "@/types";

interface AnchorQueueProps {
  items: Post[];
  onRemove: (postId: string, reason?: string) => void;
  onOverrideClassification: (postId: string, classification: string) => void;
}

export function AnchorQueue({
  items,
  onRemove,
  onOverrideClassification,
}: AnchorQueueProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Queue is clear"
        description="No items need moderation right now."
      />
    );
  }

  return (
    <div className="space-y-3 px-4">
      {items.map((post) => (
        <ModerationCard
          key={post.id}
          post={post}
          onRemove={onRemove}
          onOverrideClassification={onOverrideClassification}
        />
      ))}
    </div>
  );
}

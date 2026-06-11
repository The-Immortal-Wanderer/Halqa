import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  className?: string;
}

export function PostCard({ post, className }: PostCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-halqa-sand-mid bg-white p-4",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-halqa-ink">
            {post.author_display_name}
          </span>
          <Badge variant={post.is_emergency ? "emergency" : "default"}>
            {post.category}
          </Badge>
        </div>
        <span className="text-xs text-halqa-ink-light shrink-0">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>
      <p className="mt-2 text-sm text-halqa-ink">{post.content}</p>
      {post.is_resolved ? (
        <span className="mt-2 inline-flex items-center text-xs text-halqa-success">
          Resolved
        </span>
      ) : null}
    </div>
  );
}

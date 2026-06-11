"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatRelativeTime } from "@/lib/utils";
import type { Post } from "@/types";

interface ModerationCardProps {
  post: Post;
  onRemove: (postId: string, reason?: string) => void;
  onOverrideClassification: (postId: string, classification: string) => void;
}

export function ModerationCard({
  post,
  onRemove,
  onOverrideClassification,
}: ModerationCardProps) {
  const [removing, setRemoving] = useState(false);

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-sm font-medium text-halqa-ink">
            {post.author_display_name}
          </span>
          <Badge variant={post.is_emergency ? "emergency" : "default"}>
            {post.category}
          </Badge>
        </div>
        <span className="text-xs text-halqa-ink-light">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      <p className="mt-2 text-sm text-halqa-ink">{post.content}</p>

      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="danger"
          size="sm"
          onClick={() => onRemove(post.id)}
          loading={removing}
        >
          Remove
        </Button>
        {post.ai_classification ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onOverrideClassification(
                post.id,
                post.ai_classification === "emergency"
                  ? "general"
                  : "emergency",
              )
            }
          >
            Override classification
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

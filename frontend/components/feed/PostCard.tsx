"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import {
  Lightning,
  Shield,
  Wrench,
  Drop,
  ChatText,
  WarningCircle,
  ShieldCheck,
  CheckCircle,
} from "@phosphor-icons/react";
import type { Post } from "@/types";

interface PostCardProps {
  post: Post;
  onTap?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  power: Lightning,
  security: Shield,
  infrastructure: Wrench,
  water: Drop,
  general: ChatText,
};

const CATEGORY_LABELS: Record<string, string> = {
  power: "Power",
  security: "Security",
  infrastructure: "Infrastructure",
  water: "Water",
  general: "General",
};

export function PostCard({ post, onTap }: PostCardProps) {
  const CategoryIcon =
    CATEGORY_ICONS[post.category] ?? ChatText;
  const isEmergency = post.is_emergency;

  const handleTap = useCallback(() => {
    console.log("post detail: not implemented");
    onTap?.();
  }, [onTap]);

  return (
    <div
      onClick={handleTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleTap();
        }
      }}
      className={cn(
        "rounded-lg border bg-white p-4 cursor-pointer transition-shadow hover:shadow-sm",
        isEmergency
          ? "border-l-4 border-l-halqa-amber bg-halqa-amber-light/30"
          : "border-halqa-sand-mid",
      )}
    >
      {/* Category chip + relative time row */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            isEmergency
              ? "bg-halqa-amber text-white"
              : "bg-halqa-teal-light text-halqa-teal-dark",
          )}
        >
          {isEmergency ? (
            <WarningCircle size={12} weight="fill" />
          ) : (
            <CategoryIcon size={12} />
          )}
          {isEmergency ? "Emergency" : CATEGORY_LABELS[post.category] ?? "General"}
        </span>
        <span className="shrink-0 text-xs text-halqa-ink-light">
          {formatRelativeTime(post.created_at)}
        </span>
      </div>

      {/* Body text */}
      <p className="mt-3 text-sm leading-relaxed text-halqa-ink" dir="auto">
        {post.body}
      </p>

      {/* Author row */}
      <div className="mt-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-halqa-teal-light text-xs font-medium text-halqa-teal">
          {post.author.display_name.charAt(0).toUpperCase()}
        </span>
        <span className="text-sm text-halqa-ink">
          {post.author.display_name}
        </span>
        {post.author.tier === "tier_2" || post.author.tier === "tier_3" ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-halqa-teal">
            <ShieldCheck size={12} weight="fill" />
            Verified
          </span>
        ) : null}
      </div>

      {/* Resolved state banner */}
      {post.is_resolved ? (
        <div className="mt-3 flex items-center gap-1 border-t border-halqa-sand-mid pt-3 text-sm text-halqa-success">
          <CheckCircle size={14} weight="fill" />
          <span>Resolved {post.resolved_at ? formatRelativeTime(post.resolved_at) : ""}</span>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { postsApi } from "@/lib/api/posts";
import { anchorApi } from "@/lib/api/anchor";
import { formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft,
  WarningCircle,
  CheckCircle,
  ShieldCheck,
  Lightning,
  Shield,
  Wrench,
  Drop,
  ChatText,
  Spinner,
} from "@phosphor-icons/react";
import type { Post } from "@/types";

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

function SkeletonDetail() {
  return (
    <div className="animate-pulse px-4 pb-4 pt-2">
      <div className="mb-6 h-5 w-16 rounded bg-halqa-sand-mid" />
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded bg-halqa-sand-mid" />
        <div className="h-4 w-24 rounded bg-halqa-sand-mid" />
        <div className="h-4 w-16 rounded bg-halqa-sand-mid" />
      </div>
      <div className="mt-4 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-halqa-sand-mid" />
        <div className="h-4 w-36 rounded bg-halqa-sand-mid" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-4 w-full rounded bg-halqa-sand-mid" />
        <div className="h-4 w-full rounded bg-halqa-sand-mid" />
        <div className="h-4 w-3/4 rounded bg-halqa-sand-mid" />
        <div className="h-4 w-5/6 rounded bg-halqa-sand-mid" />
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  // Type assertions required — useParams() returns string | string[]
  // but dynamic route params are always string in this context
  const neighborhoodId = params.neighborhoodId as string;
  const postId = params.postId as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAnchor, setIsAnchor] = useState(false);
  const [resolving, setResolving] = useState(false);

  const CategoryIcon = post ? (CATEGORY_ICONS[post.category] ?? ChatText) : ChatText;

  const fetchPost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await postsApi.get(neighborhoodId, postId);
      if (res.error) {
        if (res.error.code === "POST_NOT_FOUND") {
          setError("not_found");
        } else {
          setError(res.error.message);
        }
        setPost(null);
      } else if (res.data) {
        setPost(res.data);
      }
    } catch {
      setError("Failed to load this post.");
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId, postId]);

  // Check anchor status
  useEffect(() => {
    if (!neighborhoodId) return;
    anchorApi.getStatus(neighborhoodId).then((res) => {
      if (res.data?.is_anchor) {
        setIsAnchor(true);
      }
    }).catch(() => {
      // Silently fail — anchor status is non-critical UI enhancement
    });
  }, [neighborhoodId]);

  useEffect(() => {
    if (neighborhoodId && postId) fetchPost();
  }, [neighborhoodId, postId, fetchPost]);

  const handleResolve = async () => {
    if (!post) return;
    setResolving(true);
    try {
      const res = await postsApi.resolve(neighborhoodId, post.id);
      if (!res.error && res.data) {
        setPost({ ...post, is_resolved: true, resolved_at: res.data.resolved_at ?? new Date().toISOString() });
      }
    } catch {
      // silently fail — button is an optimistic action
    } finally {
      setResolving(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <main className="min-h-screen bg-white">
        <div className="px-4 pb-4 pt-4">
        <button
          onClick={() => {
            // Fallback to feed if there's no history (direct URL entry)
            if (window.history.length <= 1) {
              router.push(`/neighborhood/${neighborhoodId}/feed`);
            } else {
              router.back();
            }
          }}
          className="flex items-center gap-1 text-halqa-ink-mid"
        >
          <ArrowLeft size={20} />
          <span className="text-[13px]">Feed</span>
        </button>
      </div>
      <SkeletonDetail />
      </main>
    );
  }

  // ── 404 state ──
  if (error === "not_found") {
    return (
      <main className="min-h-screen bg-white">
        <div className="px-4 pb-4 pt-4">
          <button
            onClick={() => {
              if (window.history.length <= 1) {
                router.push(`/neighborhood/${neighborhoodId}/feed`);
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-1 text-halqa-ink-mid"
          >
            <ArrowLeft size={20} />
            <span className="text-[13px]">Feed</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <WarningCircle size={40} className="text-halqa-ink-light" />
          <p className="mt-3 text-[15px] text-halqa-ink-mid">
            This post no longer exists.
          </p>
        </div>
      </main>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <main className="min-h-screen bg-white">
        <div className="px-4 pb-4 pt-4">
          <button
            onClick={() => {
              if (window.history.length <= 1) {
                router.push(`/neighborhood/${neighborhoodId}/feed`);
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-1 text-halqa-ink-mid"
          >
            <ArrowLeft size={20} />
            <span className="text-[13px]">Feed</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <WarningCircle size={40} className="text-halqa-danger" />
          <p className="mt-3 text-[15px] text-halqa-ink-mid">
            Couldn&apos;t load this post.
          </p>
          <p className="mt-1 text-[13px] text-halqa-ink-light">{error}</p>
        </div>
      </main>
    );
  }

  // ── Not found (no post, no error — edge case) ──
  if (!post) {
    return (
      <main className="min-h-screen bg-white">
        <div className="px-4 pb-4 pt-4">
          <button
            onClick={() => {
              if (window.history.length <= 1) {
                router.push(`/neighborhood/${neighborhoodId}/feed`);
              } else {
                router.back();
              }
            }}
            className="flex items-center gap-1 text-halqa-ink-mid"
          >
            <ArrowLeft size={20} />
            <span className="text-[13px]">Feed</span>
          </button>
        </div>
      </main>
    );
  }

  // ── Content state ──
  return (
    <main className="min-h-screen bg-white pb-8">
      {/* Back button */}
      <div className="sticky top-0 z-10 border-b border-halqa-sand-mid bg-white px-4 py-3">
        <button
          onClick={() => {
            if (window.history.length <= 1) {
              router.push(`/neighborhood/${neighborhoodId}/feed`);
            } else {
              router.back();
            }
          }}
          className="flex items-center gap-1 text-halqa-ink-mid hover:text-halqa-ink"
        >
          <ArrowLeft size={20} />
          <span className="text-[13px]">Feed</span>
        </button>
      </div>

      {/* Emergency banner */}
      {post.is_emergency ? (
        <div className="flex items-center gap-2 bg-halqa-amber px-4 py-3">
          <WarningCircle size={16} className="text-white" weight="fill" />
          <span className="text-[13px] font-medium text-white">
            Emergency Alert
          </span>
        </div>
      ) : null}

      {/* Resolved banner */}
      {post.is_resolved ? (
        <div className="flex items-center gap-2 bg-halqa-success-bg px-4 py-3">
          <CheckCircle size={16} className="text-halqa-success" weight="fill" />
          <span className="text-[13px] text-halqa-success">
            This issue has been resolved
          </span>
        </div>
      ) : null}

      {/* Content */}
      <div className="px-4 pt-4">
        {/* Category + time row */}
        <div className="flex items-center gap-2">
          <CategoryIcon size={24} className="text-halqa-teal" />
          <span className="text-[13px] text-halqa-ink-mid">
            {CATEGORY_LABELS[post.category] ?? "General"}
          </span>
          <span className="text-[13px] text-halqa-ink-light">&middot;</span>
          <span className="text-[13px] text-halqa-ink-light">
            Posted {formatRelativeTime(post.created_at)}
          </span>
        </div>

        {/* Author line */}
        <div className="mt-4 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-halqa-teal-light text-xs font-medium text-halqa-teal">
            {post.author.display_name.charAt(0).toUpperCase()}
          </span>
          <span className="text-[15px] text-halqa-ink">
            Posted by {post.author.display_name}
          </span>
          {post.author.tier === "tier_2" || post.author.tier === "tier_3" ? (
            <span className="inline-flex items-center gap-0.5 text-xs text-halqa-teal">
              <ShieldCheck size={12} weight="fill" />
              Verified
            </span>
          ) : null}
        </div>

        {/* Post body */}
        <p
          className="mt-5 text-[15px] leading-[1.65] text-halqa-ink"
          dir="auto"
        >
          {post.body}
        </p>

        {/* AI Summary card */}
        {post.ai_civic_signal ? (
          <div className="mt-6 rounded-lg bg-halqa-teal-light px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-halqa-ink-light">
              AI Summary
            </p>
            <div className="mt-1 flex items-start gap-2">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-halqa-teal" />
              <p className="text-[13px] text-halqa-ink-mid">
                Civic signal: {post.ai_civic_signal}
              </p>
            </div>
          </div>
        ) : null}

        {/* Anchor: Mark as resolved */}
        {isAnchor && !post.is_resolved ? (
          <div className="mt-8 border-t border-halqa-sand-mid pt-6">
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-halqa-sand-dark px-4 py-2.5 text-[13px] font-medium text-halqa-ink-mid transition-colors hover:border-halqa-teal hover:text-halqa-teal disabled:opacity-50"
            >
              {resolving ? (
                <Spinner size={16} className="animate-spin" />
              ) : (
                <CheckCircle size={16} />
              )}
              {resolving ? "Resolving..." : "Mark as resolved"}
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}

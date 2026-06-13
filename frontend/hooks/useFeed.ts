"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { postsApi } from "@/lib/api/posts";
import type { Post, PostListResponse } from "@/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useFeed(
  neighborhoodId: string,
  filterCategory?: string,
) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [activeEmergency, setActiveEmergency] = useState<Post | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    if (!neighborhoodId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: apiError } = await postsApi.list(neighborhoodId, {
        category: filterCategory === "emergency" ? undefined : filterCategory,
        emergency_only: filterCategory === "emergency" || undefined,
        limit: 50,
      });

      if (apiError) {
        setError(apiError.message);
        return;
      }

      if (data) {
        setPosts(data.posts);
        setHasMore(data.has_more);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId, filterCategory]);

  // Initial fetch and refetch on filter change
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Realtime subscription for INSERT and UPDATE
  useEffect(() => {
    if (!neighborhoodId) return;

    const subscription = supabase
      .channel(`feed:${neighborhoodId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
          filter: `neighborhood_id=eq.${neighborhoodId}`,
        },
        (payload: RealtimePostgresChangesPayload<Post>) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const newPost = payload.new as Post;
            setPosts((prev) => [newPost, ...prev]);
            if (newPost.is_emergency) {
              setActiveEmergency(newPost);
            }
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setPosts((prev) =>
              prev.map((p) =>
                p.id === payload.new.id ? (payload.new as Post) : p,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            setPosts((prev) =>
              prev.filter((p) => p.id !== payload.old.id),
            );
          }
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [neighborhoodId, supabase]);

  const clearEmergency = useCallback(() => {
    setActiveEmergency(null);
  }, []);

  return { posts, loading, error, hasMore, activeEmergency, clearEmergency };
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export function useFeed(neighborhoodId: string) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!neighborhoodId) return;

    // Fetch initial posts
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("posts")
        .select("*")
        .eq("neighborhood_id", neighborhoodId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) setPosts(data as Post[]);
      setLoading(false);
    };

    fetchPosts();

    // Subscribe to realtime changes
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
            setPosts((prev) => [payload.new as Post, ...prev]);
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
  }, [neighborhoodId]);

  return { posts, loading };
}

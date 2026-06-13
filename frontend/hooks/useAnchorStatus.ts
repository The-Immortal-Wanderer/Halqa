"use client";

import { useState, useEffect } from "react";
import { anchorApi } from "@/lib/api/anchor";
import type { AnchorStatusResponse } from "@/types";

export function useAnchorStatus(neighborhoodId?: string) {
  const [status, setStatus] = useState<AnchorStatusResponse | null>(null);
  const [isAnchor, setIsAnchor] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!neighborhoodId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const fetchStatus = async () => {
      try {
        const response = await anchorApi.getStatus(neighborhoodId);
        if (cancelled) return;
        if (response.error) {
          setError(response.error.message);
          setIsAnchor(false);
        } else if (response.data) {
          setStatus(response.data);
          setIsAnchor(response.data.is_anchor);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to check anchor status");
          setIsAnchor(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStatus();
    return () => { cancelled = true; };
  }, [neighborhoodId]);

  return { status, isAnchor, loading, error, refetch: () => setLoading(true) };
}

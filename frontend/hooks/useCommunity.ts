"use client";

import { useState, useEffect, useCallback } from "react";
import { membersApi } from "@/lib/api/members";
import type { CommunityMember } from "@/types";

interface UseCommunityResult {
  members: CommunityMember[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCommunity(neighborhoodId?: string): UseCommunityResult {
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!neighborhoodId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await membersApi.getMembers(neighborhoodId);
      if (response.error) {
        setError(response.error.message);
        setMembers([]);
        setTotal(0);
      } else if (response.data) {
        setMembers(response.data.members);
        setTotal(response.data.total);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
      setMembers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, total, loading, error, refetch: fetchMembers };
}

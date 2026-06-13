"use client";

import { useState, useEffect, useCallback } from "react";
import { dashboardApi } from "@/lib/api/dashboard";
import type { CivicDashboardSnapshot } from "@/types";

export function useDashboard(neighborhoodId: string) {
  const [data, setData] = useState<CivicDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<string>("30d");

  const fetchSnapshot = useCallback(async () => {
    if (!neighborhoodId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: snapshot, error: apiError } = await dashboardApi.getSnapshot(
        neighborhoodId,
        periodType,
      );

      if (apiError) {
        setError(apiError.message);
        return;
      }

      if (snapshot) {
        setData(snapshot);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId, periodType]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const refetch = useCallback(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  return { data, loading, error, periodType, setPeriodType, refetch };
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Neighborhood, NeighborhoodMembership } from "@/types";

export function useNeighborhood(neighborhoodId?: string) {
  const supabase = createClient();
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [membership, setMembership] = useState<NeighborhoodMembership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!neighborhoodId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      const [neighborhoodResult, membershipResult] = await Promise.all([
        supabase
          .from("neighborhoods")
          .select("*")
          .eq("id", neighborhoodId)
          .single(),
        supabase
          .from("neighborhood_members")
          .select("*")
          .eq("neighborhood_id", neighborhoodId)
          .single(),
      ]);

      if (neighborhoodResult.data) {
        setNeighborhood(neighborhoodResult.data as Neighborhood);
      }
      if (membershipResult.data) {
        setMembership(membershipResult.data as NeighborhoodMembership);
      }
      setLoading(false);
    };

    fetchData();
  }, [neighborhoodId]);

  return { neighborhood, membership, loading };
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { workersApi } from "@/lib/api/workers";
import type { WorkerListing, WorkerReview, WorkerDetailData } from "@/types";

interface UseDirectoryResult {
  listings: WorkerListing[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  serviceTypeFilter: string | undefined;
  setServiceTypeFilter: (st: string | undefined) => void;
}

interface UseListingDetailResult {
  listing: WorkerListing | null;
  reviews: WorkerReview[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDirectory(neighborhoodId?: string): UseDirectoryResult {
  const [listings, setListings] = useState<WorkerListing[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string | undefined>();

  const fetchListings = useCallback(async () => {
    if (!neighborhoodId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await workersApi.list(neighborhoodId, serviceTypeFilter);
      setListings(data.listings);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load directory");
      setListings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId, serviceTypeFilter]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  return {
    listings,
    total,
    loading,
    error,
    refetch: fetchListings,
    serviceTypeFilter,
    setServiceTypeFilter,
  };
}

export function useListingDetail(
  neighborhoodId?: string,
  listingId?: string
): UseListingDetailResult {
  const [listing, setListing] = useState<WorkerListing | null>(null);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!neighborhoodId || !listingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data: WorkerDetailData = await workersApi.get(
        neighborhoodId,
        listingId
      );
      setListing(data.listing);
      setReviews(data.reviews ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing");
      setListing(null);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [neighborhoodId, listingId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { listing, reviews, loading, error, refetch: fetchDetail };
}

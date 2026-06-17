import type {
  WorkerListData,
  WorkerDetailData,
  WorkerListing,
  CreateWorkerListingRequest,
} from "@/types";
import { apiFetch } from "@/lib/api/client";

/**
 * List worker listings for a neighborhood, optionally filtered by service type.
 */
export async function listWorkers(
  neighborhoodId: string,
  serviceType?: string
): Promise<WorkerListData> {
  const params = new URLSearchParams();
  if (serviceType) params.set("service_type", serviceType);
  const qs = params.toString();
  const url = `/neighborhoods/${neighborhoodId}/workers${qs ? `?${qs}` : ""}`;
  const res = await apiFetch<WorkerListData>(url);
  if (!res.data) throw new Error(res.error?.message ?? "Failed to load workers");
  return res.data;
}

/**
 * Get a single worker listing with its reviews.
 */
export async function getWorker(
  neighborhoodId: string,
  listingId: string
): Promise<WorkerDetailData> {
  const url = `/neighborhoods/${neighborhoodId}/workers/${listingId}`;
  const res = await apiFetch<WorkerDetailData>(url);
  if (!res.data) throw new Error(res.error?.message ?? "Failed to load listing");
  return res.data;
}

/**
 * Create a new worker listing (Tier 2+ only).
 */
export async function createWorkerListing(
  neighborhoodId: string,
  data: CreateWorkerListingRequest
): Promise<WorkerListing> {
  const url = `/neighborhoods/${neighborhoodId}/workers`;
  const res = await apiFetch<WorkerListing>(url, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.data) throw new Error(res.error?.message ?? "Failed to create listing");
  return res.data;
}

export const workersApi = {
  list: listWorkers,
  get: getWorker,
  create: createWorkerListing,
};

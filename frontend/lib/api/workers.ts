import { apiFetch } from "@/lib/api/client";
import type { WorkerListing, WorkerReview, CreateListingRequest, CreateReviewRequest } from "@/types";

export const workersApi = {
  list: (neighborhoodId: string) =>
    apiFetch<WorkerListing[]>(`/neighborhoods/${neighborhoodId}/workers`),

  getById: (listingId: string) =>
    apiFetch<WorkerListing>(`/workers/${listingId}`),

  create: (neighborhoodId: string, data: CreateListingRequest) =>
    apiFetch<WorkerListing>(`/neighborhoods/${neighborhoodId}/workers`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createReview: (listingId: string, data: CreateReviewRequest) =>
    apiFetch<WorkerReview>(`/workers/${listingId}/reviews`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmJob: (listingId: string) =>
    apiFetch<WorkerListing>(`/workers/${listingId}/confirm-job`, {
      method: "POST",
    }),
};

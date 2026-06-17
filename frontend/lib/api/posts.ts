import { apiFetch } from "@/lib/api/client";
import type { Post, PostCreateRequest, PostListResponse } from "@/types";

function buildQuery(params?: {
  category?: string;
  emergency_only?: boolean;
  limit?: number;
}): string {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  if (params.category) searchParams.set("category", params.category);
  if (params.emergency_only) searchParams.set("emergency_only", "true");
  if (params.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export const postsApi = {
  get: (neighborhoodId: string, postId: string) =>
    apiFetch<Post>(`/neighborhoods/${neighborhoodId}/posts/${postId}`),

  list: (
    neighborhoodId: string,
    params?: { category?: string; emergency_only?: boolean; limit?: number },
  ) =>
    apiFetch<PostListResponse>(
      `/neighborhoods/${neighborhoodId}/posts${buildQuery(params)}`,
    ),

  create: (neighborhoodId: string, data: PostCreateRequest) =>
    apiFetch<Post>(`/neighborhoods/${neighborhoodId}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resolve: (neighborhoodId: string, postId: string) =>
    apiFetch<Post>(`/neighborhoods/${neighborhoodId}/posts/${postId}/resolve`, {
      method: "PATCH",
    }),
};

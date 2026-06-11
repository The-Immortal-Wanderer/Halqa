import { apiFetch } from "@/lib/api/client";
import type { Post, CreatePostRequest, ResolvePostRequest } from "@/types";

export const postsApi = {
  list: (neighborhoodId: string) =>
    apiFetch<Post[]>(`/neighborhoods/${neighborhoodId}/posts`),

  create: (neighborhoodId: string, data: CreatePostRequest) =>
    apiFetch<Post>(`/neighborhoods/${neighborhoodId}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  resolve: (data: ResolvePostRequest) =>
    apiFetch<Post>(`/posts/${data.post_id}/resolve`, {
      method: "POST",
    }),

  flag: (postId: string, flagType: string, description?: string) =>
    apiFetch<Post>(`/posts/${postId}/flag`, {
      method: "POST",
      body: JSON.stringify({ flag_type: flagType, description }),
    }),
};

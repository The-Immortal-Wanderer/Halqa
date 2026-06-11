import { apiFetch } from "@/lib/api/client";
import type { Post, Tier3VouchingRequest } from "@/types";

export const anchorApi = {
  getQueue: (neighborhoodId: string) =>
    apiFetch<Post[]>(`/neighborhoods/${neighborhoodId}/anchor/queue`),

  removePost: (postId: string, reason?: string) =>
    apiFetch<Post>(`/anchor/posts/${postId}/remove`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  overrideClassification: (postId: string, classification: string) =>
    apiFetch<Post>(`/anchor/posts/${postId}/classify`, {
      method: "POST",
      body: JSON.stringify({ classification }),
    }),

  vouchTier3: (candidateMembershipId: string) =>
    apiFetch<Tier3VouchingRequest>("/anchor/vouch", {
      method: "POST",
      body: JSON.stringify({ candidate_membership_id: candidateMembershipId }),
    }),

  coSignTier3: (vouchingRequestId: string) =>
    apiFetch<Tier3VouchingRequest>("/anchor/cosign", {
      method: "POST",
      body: JSON.stringify({ vouching_request_id: vouchingRequestId }),
    }),
};

import { apiFetch } from "@/lib/api/client";

export interface JoinRequest {
  neighborhood_id: string;
  tier: "tier_1" | "tier_2" | "tier_3";
  declared_address: string;
}

export interface JoinResponse {
  membership_id: string;
  neighborhood_id: string;
  tier: number;
  onboarding_complete: boolean;
}

export const membersApi = {
  join: (body: JoinRequest) =>
    apiFetch<JoinResponse>("/members/join", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

import { apiFetch } from "@/lib/api/client";
import type { User } from "@/types";

export const usersApi = {
  getMe: () => apiFetch<User>("/users/me"),

  updateProfile: (data: { display_name?: string }) =>
    apiFetch<User>("/users/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

import { apiFetch } from "@/lib/api/client";
import type { CivicDashboardSnapshot } from "@/types";

export const dashboardApi = {
  getSnapshot: (neighborhoodId: string, periodDays: number) =>
    apiFetch<CivicDashboardSnapshot>(
      `/neighborhoods/${neighborhoodId}/dashboard?period=${periodDays}`,
    ),
};

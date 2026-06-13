import { apiFetch } from "@/lib/api/client";
import type { CivicDashboardSnapshot } from "@/types";

export const dashboardApi = {
  getSnapshot: (neighborhoodId: string, periodType: string) =>
    apiFetch<CivicDashboardSnapshot>(
      `/neighborhoods/${neighborhoodId}/dashboard?period_type=${periodType}`,
    ),

  getExportText: (neighborhoodId: string, periodType: string) =>
    apiFetch<{ export_text: string }>(
      `/neighborhoods/${neighborhoodId}/dashboard/export?period_type=${periodType}`,
    ),
};

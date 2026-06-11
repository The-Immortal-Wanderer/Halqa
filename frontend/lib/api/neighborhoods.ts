import { apiFetch } from "@/lib/api/client";
import type { Neighborhood } from "@/types";

export const neighborhoodsApi = {
  search: (query: string) =>
    apiFetch<Neighborhood[]>(`/neighborhoods/search?q=${encodeURIComponent(query)}`),

  getById: (id: string) => apiFetch<Neighborhood>(`/neighborhoods/${id}`),
};

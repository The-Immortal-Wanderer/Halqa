import { publicApiFetch } from "@/lib/api/client";
import type { Neighborhood } from "@/types";

export const neighborhoodsApi = {
  search: (query: string) =>
    publicApiFetch<Neighborhood[]>(`/neighborhoods/search?q=${encodeURIComponent(query)}`),

  getById: (id: string) => publicApiFetch<Neighborhood>(`/neighborhoods/${id}`),
};

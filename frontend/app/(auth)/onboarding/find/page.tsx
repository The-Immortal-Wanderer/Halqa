"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import { MagnifyingGlass, MapPin, Plus } from "@phosphor-icons/react";
import { useDebounce } from "@/hooks/useDebounce";
import { neighborhoodsApi } from "@/lib/api/neighborhoods";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { NeighborhoodSearchResult } from "@/components/neighborhood/NeighborhoodSearchResult";
import type { Neighborhood } from "@/types";

export default function NeighborhoodFindPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Neighborhood[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await neighborhoodsApi.search(q);
      if (res.error) {
        setError(res.error.message);
        setResults([]);
      } else {
        setResults(res.data ?? []);
      }
    } catch {
      setError("Unable to search. Please check your connection.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  return (
    <main className="min-h-screen bg-halqa-sand">
      <OnboardingHeader title="Find your neighborhood" showBack onBack={() => router.push("/onboarding")} />

      <div className="px-4 pt-4">
        <div className="relative">
          <MagnifyingGlass
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-halqa-ink-light"
          />
          <input
            type="text"
            placeholder="Search your street, society, or area..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full rounded-md border border-halqa-sand-dark bg-white py-2.5 pl-10 pr-3 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
          />
        </div>
      </div>

      <div className="mt-2 px-4">
        {loading ? (
          <p className="py-8 text-center text-sm text-halqa-ink-light">
            Searching...
          </p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-halqa-danger">{error}</p>
        ) : results.length === 0 && query.trim().length >= 2 ? (
          <div className="py-8 text-center">
            <MapPin size={32} className="mx-auto text-halqa-ink-light" />
            <p className="mt-2 text-sm text-halqa-ink-light">
              No neighborhoods found for &ldquo;{query}&rdquo;
            </p>
          </div>
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="mt-2 space-y-1 px-4">
          {results.map((neighborhood) => (
            <li key={neighborhood.id}>
              <NeighborhoodSearchResult
                neighborhood={neighborhood}
                onSelect={() =>
                  router.push(`/onboarding/confirm/${neighborhood.id}`)
                }
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 px-4">
        <button
          type="button"
          onClick={() => console.log("Add neighborhood flow — not implemented in this sprint")}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-halqa-sand-dark px-4 py-3 text-sm font-medium text-halqa-ink-mid hover:bg-halqa-sand-dark/10"
        >
          <Plus size={18} />
          Don&apos;t see your neighborhood? Add it.
        </button>
      </div>
    </main>
  );
}

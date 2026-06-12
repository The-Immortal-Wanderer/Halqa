"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";
import { MapPin, Users, ShieldCheck } from "@phosphor-icons/react";
import { neighborhoodsApi } from "@/lib/api/neighborhoods";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import type { Neighborhood } from "@/types";

export default function NeighborhoodConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchNeighborhood() {
      try {
        const res = await neighborhoodsApi.getById(id);
        if (cancelled) return;
        if (res.error) {
          setError(res.error.message);
        } else {
          setNeighborhood(res.data);
        }
      } catch {
        if (!cancelled) setError("Failed to load neighborhood.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchNeighborhood();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-halqa-sand">
        <OnboardingHeader title="Confirm neighborhood" showBack onBack={() => router.push("/onboarding/find")} />
        <p className="px-4 pt-8 text-center text-sm text-halqa-ink-light">Loading...</p>
      </main>
    );
  }

  if (error || !neighborhood) {
    return (
      <main className="min-h-screen bg-halqa-sand">
        <OnboardingHeader title="Confirm neighborhood" showBack onBack={() => router.push("/onboarding/find")} />
        <p className="px-4 pt-8 text-center text-sm text-halqa-danger">
          {error ?? "Neighborhood not found."}
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-halqa-sand">
      <OnboardingHeader title="Confirm neighborhood" showBack onBack={() => router.push("/onboarding/find")} />

      <div className="flex h-[180px] w-full items-center justify-center bg-halqa-sand-dark">
        <MapPin size={36} className="text-halqa-teal" />
      </div>

      <div className="px-4 pt-5">
        <h2 className="text-xl font-bold text-halqa-ink">{neighborhood.name}</h2>
        <p className="mt-1 text-sm text-halqa-ink-light">
          {neighborhood.sector_or_area
            ? `${neighborhood.sector_or_area}, ${neighborhood.city}`
            : neighborhood.city}
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-sm text-halqa-ink-mid">
          <Users size={16} />
          <span>{neighborhood.total_member_count} member{neighborhood.total_member_count !== 1 ? "s" : ""}</span>
        </div>

        <div className="mt-6 rounded-lg bg-halqa-teal-light/50 px-4 py-3">
          <div className="flex items-start gap-2">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-halqa-teal" />
            <p className="text-sm text-halqa-ink-mid">
              Halqa connects you with verified neighbors in your area.
              You&apos;ll be asked to verify your address after joining.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push(`/onboarding/register?neighborhoodId=${id}`)}
          className="mt-8 w-full rounded-md bg-halqa-teal px-4 py-3 text-sm font-semibold text-white hover:bg-halqa-teal-dark"
        >
          Join this neighborhood
        </button>

        <p className="mt-3 text-center text-xs text-halqa-ink-light">
          You&apos;ll verify your address in the next step.
        </p>
      </div>
    </main>
  );
}

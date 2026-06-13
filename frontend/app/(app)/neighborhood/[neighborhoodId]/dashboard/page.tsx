"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react";
import { verificationApi } from "@/lib/api/verification";
import { useDashboard } from "@/hooks/useDashboard";
import { PeriodSelector } from "@/components/dashboard/PeriodSelector";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CategoryBar } from "@/components/dashboard/CategoryBar";
import { ResolutionBar } from "@/components/dashboard/ResolutionBar";
import { RecentEmergencyList } from "@/components/dashboard/RecentEmergencyList";
import { ExportCard } from "@/components/dashboard/ExportCard";
import type { DashboardPeriod } from "@/types";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const params = useParams();
  const neighborhoodId = params.neighborhoodId as string;
  const [tier, setTier] = useState<number | "loading">("loading");

  const { data, loading, error, periodType, setPeriodType } =
    useDashboard(neighborhoodId);

  useEffect(() => {
    async function load() {
      try {
        const res = await verificationApi.getStatus();
        if (res.data?.status === "approved") {
          setTier(2);
        } else {
          setTier(1);
        }
      } catch {
        setTier(1);
      }
    }
    load();
  }, []);

  const handlePeriodChange = useCallback(
    (period: DashboardPeriod) => {
      setPeriodType(period);
    },
    [setPeriodType],
  );

  // Tier 1 banner
  if (tier === 1) {
    return (
      <div className="flex flex-col items-center px-4 py-16">
        <ShieldCheck size={48} className="text-halqa-amber-dark" />
        <h2 className="mt-4 text-lg font-semibold text-halqa-ink">
          Verify to access the dashboard
        </h2>
        <p className="mt-2 max-w-sm text-center text-sm text-halqa-ink-mid">
          The civic dashboard is available to verified members. Verify your
          address to view neighborhood intelligence reports.
        </p>
        <Link
          href="/verify/upload"
          className="mt-6 rounded-lg bg-halqa-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-halqa-teal-dark"
        >
          Verify now
        </Link>
      </div>
    );
  }

  // Loading state
  if (loading || tier === "loading") {
    return (
      <div className="px-4 py-4">
        <div className="h-8 w-48 animate-pulse rounded bg-halqa-sand-mid" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg bg-halqa-sand-mid"
            />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-halqa-danger">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm font-semibold text-halqa-teal underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Empty / no data state
  if (!data) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-halqa-ink-mid">
          No dashboard data available for this period.
        </p>
      </div>
    );
  }

  const categoryTotal = Object.values(data.category_breakdown ?? {}).reduce(
    (sum, c) => sum + c,
    0,
  );

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-halqa-ink">
            {data.neighborhood_name ?? "Neighborhood"} Intelligence Report
          </h1>
          <p className="text-sm text-halqa-ink-light">
            {data.period_start} to {data.period_end}
          </p>
        </div>
        <PeriodSelector
          value={periodType as DashboardPeriod}
          onChange={handlePeriodChange}
        />
      </div>

      {/* 2x2 Metric Cards */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricCard
          label="TOTAL REPORTS"
          value={data.total_posts}
        />
        <MetricCard
          label="EMERGENCIES"
          value={data.emergency_posts}
        />
        <MetricCard
          label="RESOLVED"
          value={data.resolved_posts}
        />
        <MetricCard
          label="ACTIVE MEMBERS"
          value={data.active_members}
        />
      </div>

      {/* REPORTS BY TYPE */}
      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-halqa-ink-light">
          Reports by type
        </h2>
        <div className="mt-3">
          <CategoryBar
            breakdown={data.category_breakdown ?? {}}
            total={categoryTotal}
          />
        </div>
      </section>

      {/* RESOLUTION RATE */}
      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-halqa-ink-light">
          Resolution rate
        </h2>
        <div className="mt-3">
          <ResolutionBar
            resolved={data.resolved_posts}
            total={data.total_posts}
          />
        </div>
      </section>

      {/* RECENT EMERGENCIES */}
      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-halqa-ink-light">
          Recent emergencies
        </h2>
        <div className="mt-3">
          <RecentEmergencyList neighborhoodId={neighborhoodId} />
        </div>
      </section>

      {/* SHARE WITH INSTITUTIONS */}
      <section className="mt-6">
        <h2 className="text-xs font-medium uppercase tracking-wide text-halqa-ink-light">
          Share with institutions
        </h2>
        <div className="mt-3">
          <ExportCard
            neighborhoodId={neighborhoodId}
            periodType={periodType}
            neighborhoodName={
              data.neighborhood_name ?? "Unknown Neighborhood"
            }
            city=""
            snapshotData={{
              period_start: data.period_start,
              period_end: data.period_end,
              total_posts: data.total_posts,
              emergency_posts: data.emergency_posts,
              resolved_posts: data.resolved_posts,
              category_breakdown: data.category_breakdown ?? {},
            }}
          />
        </div>
      </section>
    </div>
  );
}

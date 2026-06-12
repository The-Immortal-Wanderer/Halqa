"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Deep link handler — reads status/reason from query params (set by the
 * PWA when opened via a deep link) and redirects to the result screen.
 *
 * Route: /deeplink?status=approved|rejected&reason=<code>&neighborhood_id=<id>
 */
export default function DeeplinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const status = searchParams.get("status");
    const reason = searchParams.get("reason");
    const neighborhoodId = searchParams.get("neighborhood_id");

    if (status === "approved") {
      router.replace(
        `/verify/result?status=approved${
          neighborhoodId ? `&neighborhood_id=${neighborhoodId}` : ""
        }`,
      );
    } else if (status === "rejected") {
      router.replace(
        `/verify/result?status=rejected&reason=${reason || "address_mismatch"}${
          neighborhoodId ? `&neighborhood_id=${neighborhoodId}` : ""
        }`,
      );
    } else {
      // Unknown deep link — go to feed
      router.replace("/feed");
    }
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-halqa-sand flex items-center justify-center">
      <p className="text-sm text-halqa-ink-light">Redirecting…</p>
    </main>
  );
}

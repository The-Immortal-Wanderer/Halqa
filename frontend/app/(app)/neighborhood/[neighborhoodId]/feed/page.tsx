"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "@phosphor-icons/react";
import { verificationApi } from "@/lib/api/verification";
import type { VerificationStatus } from "@/types";

export const dynamic = "force-dynamic";

export default function FeedPage() {
  const [tier, setTier] = useState<1 | 2 | 3 | "loading">("loading");

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

  const showTier1Banner = tier === 1;

  return (
    <div>
      {/* Tier 1 banner */}
      {showTier1Banner && (
        <div className="flex items-center gap-3 bg-halqa-amber-light px-4 py-3">
          <ShieldCheck size={20} className="shrink-0 text-halqa-amber-dark" />
          <p className="flex-1 text-sm text-halqa-amber-dark">
            You&apos;re browsing as an unverified member. Verify your address
            to post and interact.
          </p>
          <Link
            href="/verify/upload"
            className="shrink-0 text-sm font-semibold text-halqa-amber-dark underline"
          >
            Verify now &rarr;
          </Link>
        </div>
      )}

      <h1 className="px-4 pt-4 text-xl font-semibold text-halqa-ink">Feed</h1>
    </div>
  );
}

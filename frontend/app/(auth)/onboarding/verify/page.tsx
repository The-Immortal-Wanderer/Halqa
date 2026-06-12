"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
import { ShieldCheck, UploadSimple } from "@phosphor-icons/react";
import { neighborhoodsApi } from "@/lib/api/neighborhoods";
import { membersApi } from "@/lib/api/members";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { DocumentTypeRow } from "@/components/onboarding/DocumentTypeRow";
import type { Neighborhood } from "@/types";

export default function VerificationEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const neighborhoodId = searchParams.get("neighborhoodId");

  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(null);
  const [joinStatus, setJoinStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [neighborhoodError, setNeighborhoodError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const nid = neighborhoodId;
      if (!nid) return;

      try {
          const neighborRes = await neighborhoodsApi.getById(nid);
        if (cancelled) return;
        if (neighborRes.data) setNeighborhood(neighborRes.data);
      } catch {
        if (!cancelled) setNeighborhoodError("Could not load neighborhood details.");
      }
    }

    load();
    return () => { cancelled = true; };
  }, [neighborhoodId]);

  useEffect(() => {
    let cancelled = false;

    async function join() {
      const nid = neighborhoodId;
      if (!nid || joinStatus !== "idle") return;
      setJoinStatus("loading");

      try {
        const res = await membersApi.join({
          neighborhood_id: nid,
          tier: "tier_1",
          declared_address: "",
        });
        if (cancelled) return;
        if (res.error && res.error.code === "ALREADY_A_MEMBER") {
          setJoinStatus("done");
        } else if (res.error) {
          setJoinStatus("error");
        } else {
          setJoinStatus("done");
        }
      } catch {
        if (!cancelled) setJoinStatus("error");
      }
    }

    join();
    return () => { cancelled = true; };
  }, [neighborhoodId, joinStatus]);

  function handleSkip() {
    router.push("/feed");
  }

  function handleUpload() {
    // Placeholder for next feature
    console.log("Document upload flow — not implemented in this sprint");
  }

  const heading = neighborhood
    ? `${neighborhood.name}`
    : "Your neighborhood";

  return (
    <main className="min-h-screen bg-halqa-sand">
      <OnboardingHeader
        title="Verify your address"
        showBack
        backDisabled
        onBack={() => {}}
      />

      <div className="flex flex-col items-center px-4 pt-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-halqa-teal-light">
          <ShieldCheck size={32} className="text-halqa-teal" />
        </div>

        <h2 className="mt-4 text-lg font-bold text-halqa-ink">{heading}</h2>
        <p className="mt-2 text-sm text-halqa-ink-light">
          Upload a document to verify your address and unlock full access to
          neighborhood features.
        </p>

        <div className="mt-6 w-full space-y-2 text-left">
          <DocumentTypeRow
            label="Utility Bill"
            description="Electricity, gas, or water bill"
          />
          <DocumentTypeRow
            label="Rental Agreement"
            description="Signed rental or lease agreement"
          />
          <DocumentTypeRow
            label="Society Card"
            description="Housing society ID or allotment letter"
          />
        </div>

        <button
          type="button"
          onClick={handleUpload}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-halqa-teal px-4 py-3 text-sm font-semibold text-white hover:bg-halqa-teal-dark"
        >
          <UploadSimple size={18} />
          Upload a document
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="mt-4 w-full rounded-md border border-halqa-sand-dark px-4 py-3 text-sm font-medium text-halqa-ink-mid hover:bg-halqa-sand-dark/10"
        >
          Skip for now — join as unverified
        </button>

        {joinStatus === "error" ? (
          <p className="mt-4 text-xs text-halqa-danger">
            Could not create membership. You can retry by signing in again.
          </p>
        ) : null}
      </div>
    </main>
  );
}

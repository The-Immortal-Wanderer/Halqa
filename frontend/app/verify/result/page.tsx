"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { verificationApi } from "@/lib/api/verification";

export const dynamic = "force-dynamic";

const REJECTION_MESSAGES: Record<string, string> = {
  address_mismatch:
    "The address on the document doesn't match what you entered.",
  too_blurry:
    "The document was too blurry to read.",
  document_unreadable:
    "The document was too blurry to read.",
  name_not_found:
    "We couldn't find your name on this document.",
  unsupported_type:
    "This document type isn't accepted.",
  document_type_invalid:
    "This document type isn't accepted.",
};

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const reason = searchParams.get("reason") || "address_mismatch";
  const [showCard, setShowCard] = useState(false);
  const [showButton, setShowButton] = useState(false);

  const isApproved = status === "approved";

  // Fade-in animation timing
  useEffect(() => {
    const t1 = setTimeout(() => setShowCard(true), 50);
    const t2 = setTimeout(() => setShowButton(true), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // On approved mount: upgrade tier
  useEffect(() => {
    if (!isApproved) return;
    async function upgrade() {
      try {
        await verificationApi.upgradeTier();
      } catch {
        // Silently handle — tier upgrade is best-effort from frontend
      }
    }
    upgrade();
  }, [isApproved]);

  function handleGoToNeighborhood() {
    router.replace("/feed");
  }

  function handleTryAgain() {
    router.push("/verify/upload");
  }

  function handleAskForHelp() {
    window.location.href = "mailto:support@halqa.app";
  }

  if (!status) return null;

  return (
    <main className="min-h-screen bg-halqa-sand flex flex-col items-center justify-center px-6">
      {isApproved ? (
        <>
          {/* Approved card */}
          <div
            className="w-full max-w-xs rounded-lg border border-halqa-success bg-halqa-success-bg p-6 text-center"
            style={{
              opacity: showCard ? 1 : 0,
              transition: "opacity 200ms ease-in-out",
            }}
          >
            <CheckCircle
              size={28}
              className="text-halqa-success mx-auto"
              weight="fill"
            />
            <h2 className="mt-4 text-lg font-semibold text-halqa-ink">
              Address verified
            </h2>
            <p className="mt-2 text-sm text-halqa-ink-mid">
              You&apos;re now a verified member of your neighborhood.
            </p>
          </div>

          <div
            className="mt-6 w-full max-w-xs"
            style={{
              opacity: showButton ? 1 : 0,
              transition: "opacity 200ms ease-in-out",
            }}
          >
            <Button fullWidth onClick={handleGoToNeighborhood}>
              Go to your neighborhood
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Rejected card */}
          <div
            className="w-full max-w-xs rounded-lg border border-halqa-danger bg-halqa-danger-bg p-6 text-center"
            style={{
              opacity: showCard ? 1 : 0,
              transition: "opacity 200ms ease-in-out",
            }}
          >
            <WarningCircle
              size={28}
              className="text-halqa-danger mx-auto"
              weight="fill"
            />
            <h2 className="mt-4 text-lg font-semibold text-halqa-ink">
              We couldn&apos;t verify this document.
            </h2>
            <p className="mt-2 text-sm text-halqa-ink-mid">
              {REJECTION_MESSAGES[reason] || "We weren't able to process this document."}
            </p>
          </div>

          <div
            className="mt-6 w-full max-w-xs space-y-3"
            style={{
              opacity: showButton ? 1 : 0,
              transition: "opacity 200ms ease-in-out",
            }}
          >
            <Button fullWidth onClick={handleTryAgain}>
              Try a different document
            </Button>
            <Button fullWidth variant="ghost" onClick={handleAskForHelp}>
              Ask for help
            </Button>
          </div>
        </>
      )}
    </main>
  );
}

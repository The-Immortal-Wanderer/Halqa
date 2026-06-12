"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { verificationApi } from "@/lib/api/verification";

export const dynamic = "force-dynamic";

export default function PendingPage() {
  const router = useRouter();
  const supabase = createClient();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    // Get the user ID for channel subscription
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, [supabase]);

  // Polling loop — check status every 10s
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await verificationApi.getStatus();
        if (res.data?.status === "approved") {
          router.push("/verify/result?status=approved");
        } else if (res.data?.status === "rejected") {
          const reason = res.data.rejection_reason || "address_mismatch";
          router.push(`/verify/result?status=rejected&reason=${reason}`);
        }
      } catch {
        // Silently retry on next poll
      }
    }

    pollingRef.current = setInterval(checkStatus, 10000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [router]);

  // Realtime subscription — instant redirect on notification
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notif = payload.new as Record<string, string>;
          if (notif.type === "verification_approved") {
            router.push("/verify/result?status=approved");
          } else if (notif.type === "verification_rejected") {
            const deepLink = notif.deep_link || "";
            const reasonMatch = deepLink.match(/reason=([^&]+)/);
            const reason = reasonMatch ? reasonMatch[1] : "address_mismatch";
            router.push(`/verify/result?status=rejected&reason=${reason}`);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase, router]);

  return (
    <main className="min-h-screen bg-halqa-sand flex flex-col items-center justify-center px-6">
      {/* Pulse ring — single pulse on mount via CSS animation */}
      <div className="relative flex items-center justify-center">
        <div className="h-12 w-12 rounded-full border-[3px] border-halqa-teal pulse-ring" />
      </div>

      <h2 className="mt-5 text-lg font-semibold text-halqa-ink">
        Verifying your address
      </h2>
      <p className="mt-2 text-sm text-halqa-ink-mid">
        This usually takes a few minutes.
      </p>
      <p className="mt-2 text-xs text-halqa-ink-light text-center max-w-[260px]">
        You can close the app — we&apos;ll notify you when it&apos;s done.
      </p>

      <style jsx>{`
        @keyframes pulse-once {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .pulse-ring {
          animation: pulse-once 1.5s ease-in-out 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-ring {
            opacity: 0.7;
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}

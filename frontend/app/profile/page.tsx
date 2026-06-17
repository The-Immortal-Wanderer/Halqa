"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { neighborhoodsApi } from "@/lib/api/neighborhoods";
import { verificationApi } from "@/lib/api/verification";
import {
  ShieldCheck,
  ArrowRight,
  SignOut,
  WarningCircle,
} from "@phosphor-icons/react";

interface MembershipInfo {
  neighborhood_id: string;
  tier: string;
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="px-4 pb-4 pt-4">
        <h1 className="text-[22px] font-semibold text-halqa-ink">Profile</h1>
      </div>
      <div className="animate-pulse space-y-4 px-4 pb-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-halqa-sand-mid" />
          <div className="space-y-2">
            <div className="h-5 w-36 rounded bg-halqa-sand-mid" />
            <div className="h-4 w-52 rounded bg-halqa-sand-mid" />
          </div>
        </div>
        <div className="h-4 w-24 rounded bg-halqa-sand-mid" />
        <div className="rounded-lg border border-halqa-sand-mid p-4">
          <div className="h-4 w-32 rounded bg-halqa-sand-mid" />
          <div className="mt-2 h-3 w-48 rounded bg-halqa-sand-mid" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [neighborhoodName, setNeighborhoodName] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!cancelled) setLoading(false);
          return;
        }

        const user = session.user;
        if (!cancelled) {
          setEmail(user.email ?? null);
          setDisplayName(user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? null);
        }

        // Get membership tier + neighborhood from Supabase directly
        const memRes = await supabase
          .from("neighborhood_members")
          .select("neighborhood_id, tier")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!cancelled && memRes.data) {
          const membership = memRes.data as MembershipInfo;
          setTier(membership.tier);

          // Fetch neighborhood name + member count
          const nRes = await neighborhoodsApi.getById(membership.neighborhood_id);
          if (!cancelled) {
            if (nRes.data?.name) {
              setNeighborhoodName(nRes.data.name);
            }
            if (nRes.data?.member_count !== undefined) {
              setMemberCount(nRes.data.member_count);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Couldn't load profile");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/onboarding");
  }, [router]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const initials = displayName?.charAt(0).toUpperCase() ?? "?";

  if (loading) return <ProfileSkeleton />;

  // Error state
  if (loadError) {
    return (
      <main className="min-h-screen bg-white">
        <div className="border-b border-halqa-sand-mid px-4 pb-4 pt-4">
          <h1 className="text-[22px] font-semibold text-halqa-ink">Profile</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <WarningCircle size={40} className="text-halqa-danger" />
          <p className="mt-3 text-[15px] text-halqa-ink-mid">
            Couldn&apos;t load profile
          </p>
          <p className="mt-1 text-[13px] text-halqa-ink-light">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-halqa-teal px-6 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-8">
      {/* Header */}
      <div className="border-b border-halqa-sand-mid px-4 pb-4 pt-4">
        <h1 className="text-[22px] font-semibold text-halqa-ink">Profile</h1>
      </div>

      {/* Avatar + name + email */}
      <div className="flex items-center gap-4 px-4 pb-5 pt-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-halqa-teal text-xl font-semibold text-white">
          {initials}
        </span>
        <div>
          <p className="text-[22px] font-semibold text-halqa-ink">
            {displayName ?? "Resident"}
          </p>
          <p className="mt-0.5 text-[15px] text-halqa-ink-mid">
            {email ?? ""}
          </p>
        </div>
      </div>

      {/* Tier badge */}
      <div className="px-4 pb-5">
        <span className="inline-flex items-center gap-1 rounded-full bg-halqa-teal-light px-3 py-1 text-xs font-medium text-halqa-teal-dark">
          <ShieldCheck size={14} weight="fill" />
          {tier === "tier_3"
            ? "Tier 3 — Community Vouched"
            : tier === "tier_2"
              ? "Tier 2 — Document Verified"
              : "Tier 1 — Self Declared"}
        </span>
      </div>

      {/* Your Neighborhood */}
      {neighborhoodName ? (
        <div className="mx-4 rounded-lg border border-halqa-sand-mid p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-halqa-ink-light">
            Your Neighborhood
          </p>
          <p className="mt-1 text-[15px] font-medium text-halqa-ink">
            {neighborhoodName}
          </p>
          {memberCount !== null ? (
            <p className="mt-0.5 text-[13px] text-halqa-ink-light">
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Divider */}
      <div className="mx-4 mt-6 border-t border-halqa-sand-mid" />

      {/* Settings section */}
      <div className="px-4 pb-2 pt-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-halqa-ink-light">
          Settings
        </p>
      </div>

      {/* Settings rows */}
      <button
        onClick={() => showToast("Coming soon")}
        className="flex w-full min-h-[48px] items-center justify-between px-4 text-left text-[15px] text-halqa-ink-mid transition-colors hover:bg-halqa-sand"
      >
        <span>Notification preferences</span>
        <ArrowRight size={16} className="text-halqa-ink-light" />
      </button>

      <button
        onClick={() => showToast("Coming soon")}
        className="flex w-full min-h-[48px] items-center justify-between px-4 text-left text-[15px] text-halqa-ink-mid transition-colors hover:bg-halqa-sand"
      >
        <span>Privacy settings</span>
        <ArrowRight size={16} className="text-halqa-ink-light" />
      </button>

      <button
        onClick={() => showToast("Coming soon")}
        className="flex w-full min-h-[48px] items-center justify-between px-4 text-left text-[15px] text-halqa-ink-mid transition-colors hover:bg-halqa-sand"
      >
        <span>About Halqa</span>
        <ArrowRight size={16} className="text-halqa-ink-light" />
      </button>

      {/* Divider before sign out */}
      <div className="mx-4 mt-4 border-t border-halqa-sand-mid" />

      {/* Sign out */}
      <div className="px-4 pb-4 pt-4">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-0 px-4 py-3 text-[15px] font-medium text-halqa-danger transition-colors hover:bg-halqa-danger-bg"
        >
          <SignOut size={16} />
          Sign out
        </button>
      </div>

      {/* Toast */}
      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-halqa-ink px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

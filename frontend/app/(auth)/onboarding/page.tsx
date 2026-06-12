"use client";

import Link from "next/link";
import { HalqaLogo } from "@/components/layout/HalqaLogo";

export default function OnboardingEntryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-halqa-sand px-6">
      <div className="flex flex-col items-center text-center">
        <HalqaLogo size="xl" showUrdu />

        <p className="mt-6 text-base text-halqa-ink-mid">
          Your neighborhood, organized.
        </p>
        <p className="mt-1 text-sm text-halqa-ink-light" dir="rtl">
          آپ کا حلقہ، منظم۔
        </p>

        <div className="mt-10 flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/onboarding/find"
            className="flex w-full items-center justify-center rounded-md bg-halqa-teal px-4 py-3 text-sm font-semibold text-white hover:bg-halqa-teal-dark"
          >
            Find my neighborhood
          </Link>

          <button
            type="button"
            onClick={() => console.log("Invite code flow — not implemented in this sprint")}
            className="flex w-full items-center justify-center rounded-md border border-halqa-sand-dark px-4 py-3 text-sm font-medium text-halqa-ink-mid hover:bg-halqa-sand-dark/10"
          >
            I have an invite code
          </button>
        </div>

        <p className="mt-8 text-sm text-halqa-ink-light">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-halqa-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

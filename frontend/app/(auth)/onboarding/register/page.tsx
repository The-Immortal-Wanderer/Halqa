"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";
import { OnboardingHeader } from "@/components/layout/OnboardingHeader";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function AccountCreationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const neighborhoodId = searchParams.get("neighborhoodId");

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit = displayName.trim().length >= 2 && email.includes("@") && password.length >= 6;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (displayName.trim().length < 2) {
      setError("Display name must be at least 2 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Register the account
      const registerRes = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            display_name: displayName.trim(),
          }),
        },
      );
      const registerJson = await registerRes.json();

      if (registerJson.error) {
        if (registerJson.error.message.includes("already")) {
          setError(
            "An account with this email already exists. Log in instead?",
          );
        } else {
          setError(registerJson.error.message);
        }
        return;
      }

      // Step 2: Log in to get a session
      const loginRes = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );
      const loginJson = await loginRes.json();

      if (loginJson.error) {
        setError("Account created but login failed. Please try signing in.");
        return;
      }

      // Step 3: Store session
      await supabase.auth.setSession({
        access_token: loginJson.data.access_token,
        refresh_token: loginJson.data.refresh_token,
      });

      // Step 4: Navigate to verification screen
      const target = neighborhoodId
        ? `/onboarding/verify?neighborhoodId=${neighborhoodId}`
        : "/onboarding/verify";
      router.push(target);
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-halqa-sand">
      <OnboardingHeader title="Create your account" showBack onBack={() => router.back()} />

      <div className="px-4 pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-halqa-ink">
              Display name
            </label>
            <input
              id="displayName"
              type="text"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
              className="w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2.5 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-halqa-ink">
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2.5 text-sm text-halqa-ink placeholder:text-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
            />
          </div>

          <div>
            <PasswordInput
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <p className="mt-1 text-xs text-halqa-ink-light">At least 8 characters</p>
          </div>

          {error ? (
            <p className="rounded-md bg-halqa-danger-bg px-3 py-2 text-sm text-halqa-danger">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded-md bg-halqa-teal px-4 py-3 text-sm font-semibold text-white hover:bg-halqa-teal-dark disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-halqa-ink-light">
          By creating an account, you agree to our{" "}
          <button type="button" className="text-halqa-teal hover:underline" onClick={() => console.log("Terms link")}>Terms of Service</button>{" "}
          and{" "}
          <button type="button" className="text-halqa-teal hover:underline" onClick={() => console.log("Privacy link")}>Privacy Policy</button>.
        </p>
      </div>
    </main>
  );
}

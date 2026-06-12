"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { env } from "@/lib/env";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Register the account via the backend
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
        setError(registerJson.error.message);
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

      // Step 3: Store session and redirect
      await supabase.auth.setSession({
        access_token: loginJson.data.access_token,
        refresh_token: loginJson.data.refresh_token,
      });

      router.push("/onboarding");
    } catch {
      setError(
        "Unable to connect. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-halqa-sand flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-halqa-ink text-center">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-halqa-ink-light text-center">
          Join your neighborhood on Halqa.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-halqa-ink"
            >
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
              className="mt-1 block w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2 text-sm text-halqa-ink placeholder-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-halqa-ink"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2 text-sm text-halqa-ink placeholder-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-halqa-ink"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2 text-sm text-halqa-ink placeholder-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-halqa-ink"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="mt-1 block w-full rounded-md border border-halqa-sand-dark bg-white px-3 py-2 text-sm text-halqa-ink placeholder-halqa-ink-light focus:border-halqa-teal focus:outline-none focus:ring-1 focus:ring-halqa-teal"
            />
          </div>

          {error && (
            <p className="text-sm text-halqa-danger bg-halqa-danger-bg rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-halqa-teal px-4 py-2 text-sm font-semibold text-white hover:bg-halqa-teal-dark disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-halqa-ink-light">
          Already have an account?{" "}
          <a href="/login" className="text-halqa-teal hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

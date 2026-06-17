"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getRedirectTarget } from "@/lib/auth/getRedirectTarget";
import { env } from "@/lib/env";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call the backend auth/login endpoint (not apiClient — no session yet)
      const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (json.error) {
        setError(json.error.message);
        return;
      }

      // Store the session in Supabase client
      await supabase.auth.setSession({
        access_token: json.data.access_token,
        refresh_token: json.data.refresh_token,
      });

      // Redirect to correct landing based on membership
      const { path } = await getRedirectTarget(supabase);
      router.push(path);
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-halqa-sand flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-halqa-ink text-center">Sign in to Halqa</h1>
        <p className="mt-2 text-sm text-halqa-ink-light text-center">
          Enter your email and password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-halqa-ink">
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
            <label htmlFor="password" className="block text-sm font-medium text-halqa-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-halqa-ink-light">
          Don&apos;t have an account?{" "}
          <a href="/register" className="text-halqa-teal hover:underline">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}

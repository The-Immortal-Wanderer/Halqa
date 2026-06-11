import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

// Singleton — called once, reused throughout the session
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

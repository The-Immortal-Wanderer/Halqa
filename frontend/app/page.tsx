import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getRedirectTarget } from "@/lib/auth/getRedirectTarget";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const { path } = await getRedirectTarget(supabase);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-halqa-sand px-4">
      <p className="text-sm text-halqa-ink-mid">Redirecting...</p>
      <meta httpEquiv="refresh" content={`0;url=${path}`} />
    </main>
  );
}

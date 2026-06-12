import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-halqa-sand px-4">
        <p className="text-sm text-halqa-ink-mid">Redirecting...</p>
        <meta httpEquiv="refresh" content={`0;url=/neighborhoods`} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-halqa-sand px-4">
      <p className="text-sm text-halqa-ink-mid">Redirecting...</p>
      <meta httpEquiv="refresh" content={`0;url=/onboarding`} />
    </main>
  );
}

// Auth guard — redirects to /onboarding if no session
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TabBar } from "@/components/layout/TabBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect("/onboarding");

  return (
    <div className="flex flex-col min-h-screen bg-halqa-sand">
      <main className="flex-1">{children}</main>
      <TabBar />
    </div>
  );
}

// DEMO MODE — always redirect to the feed for prototype walkthrough
export const dynamic = "force-dynamic";

export default function RootPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-halqa-sand px-4">
      <p className="text-sm text-halqa-ink-mid">Redirecting...</p>
      <meta httpEquiv="refresh" content="0;url=/neighborhood/00000000-0000-0000-0000-000000000001/feed" />
    </main>
  );
}

"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-halqa-sand px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-halqa-ink">
          Something went wrong
        </h1>
        <p className="mt-3 text-halqa-ink-mid text-sm">
          We could not load this page. Try refreshing, or come back later.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-halqa-teal px-6 py-2 text-sm font-medium text-white hover:bg-halqa-teal-dark transition-colors"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

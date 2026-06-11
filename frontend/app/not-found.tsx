import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-halqa-sand px-6 text-center">
      <h1 className="text-6xl font-bold text-halqa-ink">404</h1>
      <p className="mt-4 text-lg text-halqa-ink-mid">
        This page does not exist in this neighborhood.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-halqa-teal px-6 py-3 text-white transition hover:bg-halqa-teal-dark"
      >
        Go home
      </Link>
    </div>
  );
}

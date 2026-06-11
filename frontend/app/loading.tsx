import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-halqa-sand">
      <LoadingSpinner size="lg" />
    </div>
  );
}

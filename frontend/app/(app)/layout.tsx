// DEMO MODE — auth guard bypassed for prototype walkthrough
import { TabBar } from "@/components/layout/TabBar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-halqa-sand">
      <main className="flex-1">{children}</main>
      <TabBar />
    </div>
  );
}

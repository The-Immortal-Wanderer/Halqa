export default function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-halqa-sand">
      <main className="flex-1">{children}</main>
    </div>
  );
}

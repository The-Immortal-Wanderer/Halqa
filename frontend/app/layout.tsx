import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halqa — Your neighborhood, organized.",
  description:
    "A verified community platform for Pakistani neighborhoods.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1D6A58",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans bg-halqa-sand text-halqa-ink antialiased">
        {children}
      </body>
    </html>
  );
}

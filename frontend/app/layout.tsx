import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Noto_Nastaliq_Urdu } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta-sans",
});

const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-nastaliq-urdu",
  weight: ["400", "500", "600", "700"],
});

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
    <html lang="en" className={`${plusJakartaSans.variable} ${notoNastaliqUrdu.variable}`}>
      <body className="font-sans bg-halqa-sand text-halqa-ink antialiased">
        {children}
      </body>
    </html>
  );
}

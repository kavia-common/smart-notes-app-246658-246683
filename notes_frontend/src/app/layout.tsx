import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/app/providers";

export const metadata: Metadata = {
  title: "Smart Notes",
  description: "Offline-first retro notes app with tags, pin/favorite, and sync queue.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="retro-grid min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

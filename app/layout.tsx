import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR, IBM_Plex_Mono, Silkscreen } from "next/font/google";
import "./globals.css";
import { getSession } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

const sans = IBM_Plex_Sans_KR({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500", "600"] });
const pixel = Silkscreen({ variable: "--font-pixel", subsets: ["latin"], weight: ["400", "700"] });

export const metadata: Metadata = { title: "Dana Office", description: "다나나인 버추얼 오피스" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0b0c14" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getSession();
  return (
    <html lang="ko" className={`${sans.variable} ${mono.variable} ${pixel.variable}`}>
      <body>
        <AppShell me={s ? { name: s.name, role: s.role, onboarded: s.onboarded } : null}>{children}</AppShell>
      </body>
    </html>
  );
}

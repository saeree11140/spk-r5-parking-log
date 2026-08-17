import type { Metadata } from "next";
import { Chakra_Petch, IBM_Plex_Sans_Thai } from "next/font/google";

import { AuthGate } from "@/features/auth/auth-gate";
import { ADMIN_ROBOTS_METADATA } from "@/lib/admin-metadata";

import { Providers } from "./providers";
import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ["latin", "thai"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const chakraPetch = Chakra_Petch({
  subsets: ["latin", "thai"],
  variable: "--font-system",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SPK R5 Parking Log | ระบบจัดการการจอดรถ",
  description: "ระบบจัดการ Violation และ Fine สำหรับหมู่บ้าน SPK R5",
  robots: ADMIN_ROBOTS_METADATA,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${ibmPlexSansThai.variable} ${chakraPetch.variable}`}
      lang="th"
    >
      <body>
        <Providers>
          <AuthGate>{children}</AuthGate>
        </Providers>
      </body>
    </html>
  );
}

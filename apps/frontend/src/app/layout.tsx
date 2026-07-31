import type { Metadata } from "next";
import { Chakra_Petch, Noto_Sans_Thai } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { ADMIN_ROBOTS_METADATA } from "@/lib/admin-metadata";

import { Providers } from "./providers";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["latin", "thai"],
  variable: "--font-body",
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
      className={`${notoSansThai.variable} ${chakraPetch.variable}`}
      lang="th"
    >
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}

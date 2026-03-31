import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SPK R5 Parking Log',
  description: 'ระบบติดตามการจอดรถหน้าบ้านและค่าปรับรายวัน',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

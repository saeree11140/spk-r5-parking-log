import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SPK R5 Parking Log',
  description: 'Parking Violation Management System',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

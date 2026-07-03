import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "madori-studio";
const DESC = "madori-studio - shohei_try で scaffold した Next.js アプリ";

export const metadata: Metadata = {
  title: TITLE,
  description: DESC,
  applicationName: TITLE,
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
    locale: "ja_JP",
    siteName: TITLE,
  },
  twitter: { card: "summary", title: TITLE, description: DESC },
  appleWebApp: { capable: true, title: TITLE, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";

const TITLE = "間取りスタジオ｜無料で間取り作成・3Dシミュレーション";
const DESC =
  "登録不要・無料の間取り作成ツール。部屋を描いて家具を置き、ワンクリックで3D表示。引っ越し・模様替え・レイアウト検討がブラウザだけで完結します。";

export const metadata: Metadata = {
  metadataBase: new URL("https://madori-studio.vercel.app"),
  title: TITLE,
  description: DESC,
  applicationName: "間取りスタジオ",
  openGraph: {
    title: TITLE,
    description: DESC,
    type: "website",
    locale: "ja_JP",
    siteName: "間取りスタジオ",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESC },
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
      <body className="antialiased bg-white text-slate-900">{children}</body>
    </html>
  );
}

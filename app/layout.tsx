import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "InvoMate 進貨帳冊",
  description: "進貨登打、庫存與查詢",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className={`${notoSansTc.className} min-h-screen pb-20 md:pb-0`}>{children}</body>
    </html>
  );
}

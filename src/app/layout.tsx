import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

// 仅自托管 Inter（拉丁/数字）。中文用系统字体栈（见 globals.css），
// 因为 next/font 的 Noto Sans SC 只暴露 latin 子集，中文字形无法可靠自托管。
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aivestor 投资工作台",
  description: "面向一级市场投资人的AI增强型工作平台",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Aivestor",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D1B3E",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body
        className={inter.variable}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

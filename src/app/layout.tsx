import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

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
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

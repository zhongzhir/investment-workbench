import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  // next/font 的 Noto Sans SC 类型仅暴露 latin 等通用子集；
  // 中文字形仍随字体加载（Google Fonts 按字符切片）。
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-noto",
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
        className={`${inter.variable} ${notoSansSC.variable}`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

"use client";

import { SessionProvider } from "next-auth/react";

// 全局会话上下文，供客户端组件使用 useSession。
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

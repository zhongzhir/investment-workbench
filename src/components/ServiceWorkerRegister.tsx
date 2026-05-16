"use client";

import { useEffect } from "react";

// 注册 PWA Service Worker（仅生产环境，避免开发时缓存干扰热重载）。
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker
      .register("/sw.js")
      .catch((err) => console.error("Service Worker 注册失败：", err));
  }, []);

  return null;
}

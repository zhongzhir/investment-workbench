// 投资工作台 — PWA Service Worker（基础版）
// 策略：应用外壳静态资源走「缓存优先」；导航与 API 请求走「网络优先」，
// 离线时回退到缓存的首页。后续可按需扩展为更精细的运行时缓存。

const CACHE_VERSION = "iw-cache-v1";
const APP_SHELL = ["/", "/manifest.json", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // API 请求不缓存，始终走网络
  if (url.pathname.startsWith("/api/")) return;

  // 页面导航：网络优先，离线回退首页
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/").then((res) => res || Response.error())
      )
    );
    return;
  }

  // 其他静态资源：缓存优先
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});

// 纯函数，零依赖。可在客户端组件中安全引用。
// 与 lib/freeQuota.ts 分离，避免客户端 bundle 牵入 pg / tls。

// 数字格式化：100万tokens / 23.5万tokens / 1234tokens
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "0 tokens";
  if (n >= 1_000_000) {
    const v = n / 10_000;
    const fixed = v >= 100 ? Math.round(v) : v.toFixed(1);
    return `${fixed} 万 tokens`;
  }
  if (n >= 10_000) {
    return `${(n / 10_000).toFixed(1)} 万 tokens`;
  }
  return `${n} tokens`;
}

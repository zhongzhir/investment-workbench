// 项目"沉睡"判定：active 状态 + N 天未更新。
// 纯函数，前后端共用。

export const SLEEP_DAYS = 14;
const ACTIVE_STATUSES = new Set(["evaluating", "invested"]);

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.has(status);
}

// 返回沉睡天数；若未达阈值或不是 active 状态，返回 null
export function sleepDays(
  status: string,
  updatedAt: string | null | undefined
): number | null {
  if (!updatedAt) return null;
  if (!isActiveStatus(status)) return null;
  const diff = Date.now() - new Date(updatedAt).getTime();
  if (Number.isNaN(diff)) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return days >= SLEEP_DAYS ? days : null;
}

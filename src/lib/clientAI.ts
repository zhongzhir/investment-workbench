// 客户端流式读取与跨页数据传递工具。
// AI API Key 已改为服务端加密存储，不再经客户端透传。

// 读取流式响应，逐块回调文本增量
export async function readTextStream(
  res: Response,
  onChunk: (text: string) => void
): Promise<void> {
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}

// 用于在项目页与报告页之间传递本轮判断要点
export function stashJudgmentPoints(projectId: string, points: string[]) {
  sessionStorage.setItem(`iw_gen_${projectId}`, JSON.stringify(points));
}

export function popJudgmentPoints(projectId: string): string[] | null {
  const raw = sessionStorage.getItem(`iw_gen_${projectId}`);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

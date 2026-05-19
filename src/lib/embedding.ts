// 服务端专用 embedding 生成：调用阿里云百炼 text-embedding-v4。
// API Key 从环境变量 BAILIAN_API_KEY 读取，不走用户配置的 AI Key。
// 未配置 BAILIAN_API_KEY 时返回 null，调用方降级为纯文本检索。

interface EmbeddingResult {
  vector: number[];
  model: string;
}

const BAILIAN_ENDPOINT =
  "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings";
const BAILIAN_MODEL = "text-embedding-v4";
const EMBEDDING_DIMENSIONS = 1536; // v4 支持自定义维度，固定 1536 以匹配 vector(1536) 列
const MAX_BATCH = 10; // 百炼单次请求最多 10 条输入
const MAX_CHARS = 6000; // 截断超长文本，规避 token 限制

export const EMBEDDING_MODEL = BAILIAN_MODEL;

// 批量生成 embedding（请求格式兼容 OpenAI embeddings API）。
// 返回与输入等长、顺序一致的结果数组；未配置 Key 或调用失败时返回 null。
export async function generateEmbeddingWithBailian(
  input: string | string[]
): Promise<EmbeddingResult[] | null> {
  const apiKey = process.env.BAILIAN_API_KEY;
  if (!apiKey) return null; // 未配置：跳过向量化，降级为纯文本检索

  const texts = (Array.isArray(input) ? input : [input]).map((t) =>
    (t ?? "").slice(0, MAX_CHARS)
  );
  if (texts.length === 0) return [];

  try {
    const results: EmbeddingResult[] = [];
    for (let i = 0; i < texts.length; i += MAX_BATCH) {
      const batch = texts.slice(i, i + MAX_BATCH);
      const res = await fetch(BAILIAN_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: BAILIAN_MODEL,
          input: batch,
          dimensions: EMBEDDING_DIMENSIONS,
          encoding_format: "float",
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error(
          `[bailian] embedding 请求失败 ${res.status}: ${detail}`
        );
        return null;
      }
      const data = await res.json();
      const items: { index: number; embedding: number[] }[] = data?.data ?? [];
      // 按 index 排序，保证与输入顺序一致
      items.sort((a, b) => a.index - b.index);
      for (const item of items) {
        if (!item.embedding) {
          console.error("[bailian] embedding 返回缺失向量");
          return null;
        }
        results.push({ vector: item.embedding, model: BAILIAN_MODEL });
      }
    }
    if (results.length !== texts.length) {
      console.error("[bailian] embedding 数量与输入不匹配");
      return null;
    }
    return results;
  } catch (e) {
    console.error("[bailian] embedding 异常:", e);
    return null;
  }
}

// 便捷方法：单条文本生成 embedding，返回单个结果或 null。
export async function generateEmbedding(
  text: string
): Promise<EmbeddingResult | null> {
  const res = await generateEmbeddingWithBailian(text);
  return res?.[0] ?? null;
}

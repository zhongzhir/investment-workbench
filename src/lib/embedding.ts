// 根据用户当前 AI 提供商，调用对应的 embedding 接口
// 返回 { vector: number[], model: string } 或 null（不支持时）

import OpenAI from "openai";

interface EmbeddingResult {
  vector: number[];
  model: string;
}

// 支持 embedding 的提供商配置
const EMBEDDING_PROVIDERS: Record<
  string,
  {
    baseURL: string;
    model: string;
    dimensions: number;
  }
> = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    model: "text-embedding-3-small",
    dimensions: 1536,
  },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "text-embedding-v3",
    dimensions: 1536,
  },
  doubao: {
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-embedding",
    dimensions: 1536,
  },
  minimax: {
    baseURL: "https://api.minimax.chat/v1",
    model: "embo-01",
    dimensions: 1536,
  },
};

export async function getEmbedding(
  text: string,
  provider: string,
  apiKey: string
): Promise<EmbeddingResult | null> {
  const config = EMBEDDING_PROVIDERS[provider];
  if (!config) return null; // deepseek 等不支持，返回 null

  // 截断超长文本（embedding 接口有 token 限制）
  const truncated = text.slice(0, 6000);

  try {
    // MiniMax 用自有接口，其余均兼容 OpenAI SDK
    if (provider === "minimax") {
      const res = await fetch("https://api.minimax.chat/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "embo-01",
          input: [truncated],
          type: "query",
        }),
      });
      const data = await res.json();
      const vector = data?.data?.[0]?.embedding;
      if (!vector) return null;
      return { vector, model: "embo-01" };
    }

    const client = new OpenAI({ apiKey, baseURL: config.baseURL });
    const res = await client.embeddings.create({
      model: config.model,
      input: truncated,
      ...(config.dimensions ? { dimensions: config.dimensions } : {}),
    });
    const vector = res.data[0]?.embedding;
    if (!vector) return null;
    return { vector, model: config.model };
  } catch (e) {
    console.error("[embedding] failed:", e);
    return null;
  }
}

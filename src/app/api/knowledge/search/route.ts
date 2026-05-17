import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";
import { decrypt } from "@/lib/crypto";
import OpenAI from "openai";

export const maxDuration = 60;

interface Chunk {
  content: string;
  source_type: string | null;
  score: number;
}

// 各 provider 的 OpenAI 兼容接口配置
const providerConfig: Record<string, { baseURL: string; model: string }> = {
  openai: { baseURL: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  deepseek: { baseURL: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  qwen: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
  },
  doubao: {
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-pro-32k",
  },
  minimax: { baseURL: "https://api.minimax.chat/v1", model: "abab6.5s-chat" },
  claude: {
    baseURL: "https://api.anthropic.com/v1",
    model: "claude-3-5-haiku-20241022",
  },
};

// POST /api/knowledge/search — 全文检索 + 向量检索合并，再用 AI 综合回答
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) {
    return NextResponse.json({ error: "请输入问题" }, { status: 422 });
  }

  const userRows = await query<{
    ai_provider: string | null;
    api_key_encrypted: string | null;
  }>("SELECT ai_provider, api_key_encrypted FROM users WHERE id = $1", [
    session.user.id,
  ]);
  const user = userRows[0];

  // 解密 API Key（失败则视作未配置）
  let apiKey: string | null = null;
  if (user?.api_key_encrypted) {
    try {
      apiKey = decrypt(user.api_key_encrypted);
    } catch {
      apiKey = null;
    }
  }

  // 1. 全文检索（所有用户都走这一步）
  const ftsRows = await query<Chunk>(
    `SELECT content, source_type,
            ts_rank(search_vector, plainto_tsquery('simple', $2)) AS score
       FROM knowledge_base_entries
      WHERE user_id = $1
        AND search_vector @@ plainto_tsquery('simple', $2)
      ORDER BY score DESC
      LIMIT 8`,
    [session.user.id, question]
  );
  const retrievedChunks: Chunk[] = [...ftsRows];

  // 2. 向量检索（有 embedding 支持时补充）
  if (apiKey && user?.ai_provider) {
    const embResult = await getEmbedding(question, user.ai_provider, apiKey);
    if (embResult) {
      const vectorRows = await query<Chunk>(
        `SELECT content, source_type,
                1 - (embedding <=> $2::vector) AS score
           FROM knowledge_base_entries
          WHERE user_id = $1
            AND embedding IS NOT NULL
          ORDER BY embedding <=> $2::vector
          LIMIT 8`,
        [session.user.id, `[${embResult.vector.join(",")}]`]
      );
      // 合并去重，向量结果得分加权
      const seen = new Set(retrievedChunks.map((c) => c.content));
      for (const row of vectorRows) {
        const chunk = { ...row, score: row.score * 1.2 };
        if (!seen.has(chunk.content)) {
          retrievedChunks.push(chunk);
          seen.add(chunk.content);
        }
      }
    }
  }

  // 按得分排序，取前 6 条作为上下文
  retrievedChunks.sort((a, b) => b.score - a.score);
  const context = retrievedChunks.slice(0, 6);

  if (context.length === 0) {
    return NextResponse.json({
      answer: "知识库中暂无相关内容，请先录入一些文档或笔记。",
      sources: [],
    });
  }

  // 3. AI 综合回答（流式）
  if (!apiKey) {
    return NextResponse.json({
      answer: "请先在设置页配置 AI API Key，以启用智能问答。",
      sources: context,
    });
  }

  const contextText = context
    .map((c, i) => `[${i + 1}] (来源: ${c.source_type ?? "未知"})\n${c.content}`)
    .join("\n\n---\n\n");

  const provider = user?.ai_provider ?? "deepseek";
  const config = providerConfig[provider] ?? providerConfig.deepseek;
  const client = new OpenAI({ apiKey, baseURL: config.baseURL });

  const stream = await client.chat.completions.create({
    model: config.model,
    stream: true,
    messages: [
      {
        role: "system",
        content: `你是投资人的私人知识助手。根据以下知识库内容回答问题，保持专业、简洁。
如果知识库内容不足以回答，请明确说明。不要编造信息。
知识库内容：\n\n${contextText}`,
      },
      { role: "user", content: question },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      // 先发 sources
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "sources", sources: context })}\n\n`
        )
      );
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", text })}\n\n`
            )
          );
        }
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

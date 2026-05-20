import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { streamChat, type ChatMessage } from "@/lib/ai";
import { loadUserAICredentials } from "@/lib/report";
import { injectProfile } from "@/lib/user-profile";
import { generateEmbedding } from "@/lib/embedding";
import { STAGE_LABELS } from "@/lib/stages";

export const maxDuration = 120;

interface Msg {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

interface ConvoRow {
  id: string;
  title: string | null;
  project_id: string | null;
  messages: Msg[];
}

interface ProjectRow {
  name: string;
  stage: string | null;
  status: string;
}

interface JudgmentRow {
  bull_case: string | null;
  bear_case: string | null;
  stage: string;
  created_at: string;
}

interface KBChunk {
  content: string;
  source_type: string | null;
  score: number;
}

const BASE_SYSTEM = `你是 Aivestor 的 AI 助手，专为一级股权投资人设计。

你的角色：
- 帮助投资人深度思考项目、复盘判断、提炼经验
- 在对话中主动追问，帮助投资人厘清模糊的想法
- 结合投资人的知识库（已检索相关内容见下方）给出有针对性的回应
- 观点要有依据，不要泛泛而谈

对话风格：
- 直接、专业，不客套
- 善用追问帮助投资人深化思考
- 重要观点用清晰的结构表达`;

async function buildProjectContext(
  projectId: string,
  userId: string
): Promise<string> {
  const projects = await query<ProjectRow>(
    "SELECT name, stage, status FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, userId]
  );
  const project = projects[0];
  if (!project) return "";

  const judgments = await query<JudgmentRow>(
    `SELECT bull_case, bear_case, stage, created_at
       FROM investment_judgments
      WHERE project_id = $1 AND user_id = $2
      ORDER BY created_at DESC LIMIT 2`,
    [projectId, userId]
  );

  const lines: string[] = [
    `## 当前关联项目：${project.name}`,
    `融资阶段：${project.stage || "未填写"} | 状态：${project.status}`,
  ];
  if (judgments.length > 0) {
    lines.push("最近的投资判断：");
    for (const j of judgments) {
      const parts: string[] = [];
      if (j.bull_case) parts.push(`看好：${j.bull_case}`);
      if (j.bear_case) parts.push(`顾虑：${j.bear_case}`);
      const stageLabel = STAGE_LABELS[j.stage] ?? j.stage;
      lines.push(`- 【${stageLabel}】${parts.join("；") || "（未填）"}`);
    }
  }
  return lines.join("\n");
}

async function retrieveKnowledge(
  userId: string,
  question: string
): Promise<KBChunk[]> {
  // 优先向量检索，未配置百炼则回退全文检索
  const embResult = await generateEmbedding(question);
  if (embResult) {
    const rows = await query<KBChunk>(
      `SELECT content, source_type,
              1 - (embedding <=> $2::vector) AS score
         FROM knowledge_base_entries
        WHERE user_id = $1
          AND embedding IS NOT NULL
        ORDER BY embedding <=> $2::vector
        LIMIT 3`,
      [userId, `[${embResult.vector.join(",")}]`]
    );
    return rows;
  }

  const rows = await query<KBChunk>(
    `SELECT content, source_type,
            ts_rank(search_vector, plainto_tsquery('simple', $2)) AS score
       FROM knowledge_base_entries
      WHERE user_id = $1
        AND search_vector @@ plainto_tsquery('simple', $2)
      ORDER BY score DESC
      LIMIT 3`,
    [userId, question]
  );
  return rows;
}

function buildKnowledgeSection(chunks: KBChunk[]): string {
  if (chunks.length === 0) return "";
  const items = chunks.map(
    (c, i) =>
      `[${i + 1}] (来源: ${c.source_type ?? "未知"}) ${c.content.slice(
        0,
        200
      )}`
  );
  return `## 相关知识库内容（自动检索）\n${items.join("\n\n")}`;
}

// 简易标题生成：取首条用户消息，让 AI 起 10 字以内标题
async function generateTitle(
  provider: ReturnType<typeof Object>,
  apiKey: string,
  firstMessage: string,
  reply: string
): Promise<string | null> {
  try {
    let title = "";
    for await (const chunk of streamChat({
      provider: provider as never,
      apiKey,
      system:
        "你为一段对话生成一个 10 字以内的简洁标题，只输出标题文字本身，不要引号、不要标点、不要解释。",
      messages: [
        {
          role: "user",
          content: `用户首条消息：${firstMessage.slice(0, 300)}\nAI 回复（节选）：${reply.slice(0, 300)}\n\n请输出 10 字以内标题。`,
        },
      ],
    })) {
      title += chunk;
      if (title.length > 60) break; // 防止 AI 超出
    }
    title = title.trim().replace(/^["「『]|["」』]$/g, "").trim();
    if (!title) return null;
    return title.slice(0, 30);
  } catch {
    return null;
  }
}

// POST /api/conversations/[id]/chat — 流式对话
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const userMessage = body.message?.trim();
  if (!userMessage) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 422 });
  }

  const convos = await query<ConvoRow>(
    `SELECT id, title, project_id, messages
       FROM conversations
      WHERE id = $1 AND user_id = $2`,
    [params.id, session.user.id]
  );
  if (convos.length === 0) {
    return NextResponse.json({ error: "对话不存在" }, { status: 404 });
  }
  const convo = convos[0];
  const history: Msg[] = Array.isArray(convo.messages) ? convo.messages : [];
  const isFirstTurn = history.length === 0;

  const creds = await loadUserAICredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "尚未配置 API Key，请先在设置中保存" },
      { status: 400 }
    );
  }

  // 构造 system prompt：profile + project + knowledge
  const projectSection = convo.project_id
    ? await buildProjectContext(convo.project_id, session.user.id)
    : "";
  const kbChunks = await retrieveKnowledge(session.user.id, userMessage);
  const knowledgeSection = buildKnowledgeSection(kbChunks);

  const composed = [BASE_SYSTEM, projectSection, knowledgeSection]
    .filter(Boolean)
    .join("\n\n");
  const systemPrompt = await injectProfile(session.user.id, composed);

  // 把历史 + 当前消息组装为 messages
  const messages: ChatMessage[] = [
    ...history.map(({ role, content }) => ({ role, content })),
    { role: "user", content: userMessage },
  ];

  const generator = streamChat({
    provider: creds.provider,
    apiKey: creds.apiKey,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  const sourcesMeta = kbChunks.map((c) => ({
    content: c.content,
    source_type: c.source_type,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        // 先把检索来源以 SSE meta 发给客户端
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "sources", sources: sourcesMeta })}\n\n`
          )
        );
        for await (const chunk of generator) {
          full += chunk;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", text: chunk })}\n\n`
            )
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`
          )
        );
      }

      // 持久化对话
      const now = new Date().toISOString();
      const updated: Msg[] = [
        ...history,
        { role: "user", content: userMessage, ts: now },
        { role: "assistant", content: full, ts: new Date().toISOString() },
      ];
      try {
        await query(
          "UPDATE conversations SET messages = $1, updated_at = NOW() WHERE id = $2",
          [JSON.stringify(updated), params.id]
        );
      } catch (e) {
        console.error("[conversations] 保存失败:", e);
      }

      // 首轮对话生成标题
      if (isFirstTurn && full.trim()) {
        const title = await generateTitle(
          creds.provider,
          creds.apiKey,
          userMessage,
          full
        );
        if (title) {
          try {
            await query(
              "UPDATE conversations SET title = $1 WHERE id = $2",
              [title, params.id]
            );
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "title", title })}\n\n`
              )
            );
          } catch (e) {
            console.error("[conversations] 标题保存失败:", e);
          }
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

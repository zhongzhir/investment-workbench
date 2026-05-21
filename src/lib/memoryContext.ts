import { query } from "@/lib/db";
import { generateEmbedding } from "@/lib/embedding";
import { getUserProfile, formatProfileForPrompt } from "@/lib/user-profile";

// 对话上下文记忆：把投资人画像 + 近期沉淀 + 相关知识库片段
// 三段拼成自然语言注入到 system prompt 头部。

// 短消息（如「继续」「展开」）不触发向量检索 —— 噪声大、价值低
const MIN_QUERY_LEN = 10;
const RECENT_DIGEST_LIMIT = 10;
const KB_TOPK = 5;

interface DigestRow {
  content: string;
  created_at: string;
}

interface KBHit {
  content: string;
  source_type: string | null;
}

async function recentDigests(userId: string): Promise<DigestRow[]> {
  try {
    return await query<DigestRow>(
      `SELECT content, created_at
         FROM knowledge_base_entries
        WHERE user_id = $1 AND entry_type = 'conversation_digest'
        ORDER BY created_at DESC LIMIT $2`,
      [userId, RECENT_DIGEST_LIMIT]
    );
  } catch {
    return [];
  }
}

// 复用知识库的向量检索（与 /api/knowledge/search 同一思路）。
// 优先向量；百炼未配置时回退全文检索；任一失败都返回空数组。
async function searchKnowledgeBase(
  userId: string,
  question: string,
  topK: number
): Promise<KBHit[]> {
  if (!question || question.length < MIN_QUERY_LEN) return [];
  try {
    const emb = await generateEmbedding(question);
    if (emb) {
      return await query<KBHit>(
        `SELECT content, source_type
           FROM knowledge_base_entries
          WHERE user_id = $1 AND embedding IS NOT NULL
          ORDER BY embedding <=> $2::vector
          LIMIT $3`,
        [userId, `[${emb.vector.join(",")}]`, topK]
      );
    }
    return await query<KBHit>(
      `SELECT content, source_type
         FROM knowledge_base_entries
        WHERE user_id = $1
          AND search_vector @@ plainto_tsquery('simple', $2)
        ORDER BY ts_rank(search_vector, plainto_tsquery('simple', $2)) DESC
        LIMIT $3`,
      [userId, question, topK]
    );
  } catch {
    return [];
  }
}

export interface MemoryContextResult {
  context: string;
  sources: KBHit[]; // 给前端展示的检索来源
}

export async function buildMemoryContext(
  userId: string,
  userMessage: string
): Promise<MemoryContextResult> {
  const parts: string[] = [];

  // 1. 投资人画像
  try {
    const profile = await getUserProfile(userId);
    if (profile) {
      const section = formatProfileForPrompt(profile);
      if (section) parts.push(section);
    }
  } catch {
    // 画像查询失败静默忽略
  }

  // 2. 近期对话沉淀
  const digests = await recentDigests(userId);
  if (digests.length > 0) {
    const lines = digests.map((d) => `- ${d.content}`).join("\n");
    parts.push(`## 近期认知沉淀\n${lines}`);
  }

  // 3. 与当前消息相关的知识库条目
  const hits = await searchKnowledgeBase(userId, userMessage, KB_TOPK);
  if (hits.length > 0) {
    const lines = hits
      .map(
        (h, i) =>
          `[${i + 1}] (来源: ${h.source_type ?? "未知"}) ${h.content.slice(0, 200)}`
      )
      .join("\n\n");
    parts.push(`## 相关知识库条目\n${lines}`);
  }

  return {
    context: parts.join("\n\n"),
    sources: hits,
  };
}

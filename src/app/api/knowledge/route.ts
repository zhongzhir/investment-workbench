import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";
import { decrypt } from "@/lib/crypto";

export const maxDuration = 30;

interface KBRow {
  id: string;
  content: string;
  source_type: string | null;
  tags: string[];
  embedding_model: string | null;
  created_at: string;
}

// GET /api/knowledge?page=1 — 当前用户知识库条目列表（每页 20 条）
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const page = Math.max(
    1,
    parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1
  );
  const limit = 20;
  const offset = (page - 1) * limit;

  const entries = await query<KBRow>(
    `SELECT id, content, source_type, tags, embedding_model, created_at
       FROM knowledge_base_entries
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3`,
    [session.user.id, limit, offset]
  );

  const countRows = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM knowledge_base_entries WHERE user_id = $1`,
    [session.user.id]
  );

  return NextResponse.json({
    entries,
    total: countRows[0]?.count ?? 0,
    page,
  });
}

// POST /api/knowledge — 手动录入新条目，同时尝试生成 embedding
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { content?: string; tags?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const content = body.content?.trim();
  if (!content) {
    return NextResponse.json({ error: "内容不能为空" }, { status: 422 });
  }
  const tags = Array.isArray(body.tags) ? body.tags : [];

  // 查用户的 provider + key，尝试生成 embedding
  const userRows = await query<{
    ai_provider: string | null;
    api_key_encrypted: string | null;
  }>("SELECT ai_provider, api_key_encrypted FROM users WHERE id = $1", [
    session.user.id,
  ]);
  const user = userRows[0];

  let embeddingVector: number[] | null = null;
  let embeddingModel: string | null = null;

  if (user?.api_key_encrypted && user.ai_provider) {
    try {
      const apiKey = decrypt(user.api_key_encrypted);
      const result = await getEmbedding(content, user.ai_provider, apiKey);
      if (result) {
        embeddingVector = result.vector;
        embeddingModel = result.model;
      }
    } catch {
      // 解密失败或 embedding 异常：跳过向量化，仅保留全文检索
    }
  }

  const inserted = await query<KBRow>(
    `INSERT INTO knowledge_base_entries
       (user_id, content, source_type, tags, embedding, embedding_model)
     VALUES ($1, $2, 'manual', $3, $4, $5)
     RETURNING id, content, source_type, tags, embedding_model, created_at`,
    [
      session.user.id,
      content,
      JSON.stringify(tags),
      embeddingVector ? `[${embeddingVector.join(",")}]` : null,
      embeddingModel,
    ]
  );

  return NextResponse.json({ entry: inserted[0] }, { status: 201 });
}

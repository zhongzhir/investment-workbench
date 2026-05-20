import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateEmbedding } from "@/lib/embedding";

export const maxDuration = 30;

interface KBRow {
  id: string;
  content: string;
  source_type: string | null;
  entry_type: string | null;
  structured_data: Record<string, unknown> | null;
  tags: string[];
  embedding_model: string | null;
  metadata?: Record<string, unknown>;
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
    `SELECT id, content, source_type, entry_type, structured_data,
            tags, embedding_model, metadata, created_at
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

  // 生成 embedding（百炼未配置或失败则仅保留全文检索）
  let embeddingVector: number[] | null = null;
  let embeddingModel: string | null = null;
  const result = await generateEmbedding(content);
  if (result) {
    embeddingVector = result.vector;
    embeddingModel = result.model;
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

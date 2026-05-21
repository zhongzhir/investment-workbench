import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const MAX_ITEMS = 10;

// GET /api/projects/[id]/pending-questions
// 聚合该项目关联对话沉淀里的 open_questions（兼容 pending_questions）。
// 数据存在 knowledge_base_entries.structured_data.open_questions，
// 通过 metadata.source_conversation_id → conversations.project_id 关联回项目。
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 校验项目归属
  const owned = await query<{ id: string }>(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [params.id, session.user.id]
  );
  if (owned.length === 0) {
    return NextResponse.json({ questions: [] });
  }

  // 聚合两类来源（兼容 open_questions / pending_questions 两种字段名）
  let questions: string[] = [];
  try {
    const rows = await query<{
      open_questions: unknown;
      pending_questions: unknown;
    }>(
      `SELECT kbe.structured_data->'open_questions' AS open_questions,
              kbe.metadata->'pending_questions' AS pending_questions
         FROM knowledge_base_entries kbe
         JOIN conversations c
           ON c.id = NULLIF(kbe.metadata->>'source_conversation_id', '')::uuid
        WHERE kbe.user_id = $1
          AND kbe.entry_type = 'conversation_digest'
          AND c.project_id = $2
        ORDER BY kbe.created_at DESC
        LIMIT 20`,
      [session.user.id, params.id]
    );

    const collected = new Set<string>();
    for (const row of rows) {
      for (const raw of [row.open_questions, row.pending_questions]) {
        if (!Array.isArray(raw)) continue;
        for (const q of raw) {
          if (typeof q !== "string") continue;
          const trimmed = q.trim();
          if (!trimmed) continue;
          collected.add(trimmed);
          if (collected.size >= MAX_ITEMS) break;
        }
        if (collected.size >= MAX_ITEMS) break;
      }
      if (collected.size >= MAX_ITEMS) break;
    }
    questions = Array.from(collected);
  } catch (e) {
    console.error("[pending-questions] 查询失败:", e);
  }

  return NextResponse.json({ questions });
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

interface ListRow {
  id: string;
  title: string | null;
  project_id: string | null;
  project_name: string | null;
  updated_at: string;
}

// GET /api/conversations — 当前用户的对话列表（不含 messages）
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = await query<ListRow>(
    `SELECT c.id, c.title, c.project_id, p.name AS project_name, c.updated_at
       FROM conversations c
       LEFT JOIN projects p ON p.id = c.project_id
      WHERE c.user_id = $1
      ORDER BY c.updated_at DESC
      LIMIT 50`,
    [session.user.id]
  );

  return NextResponse.json({ conversations: rows });
}

// POST /api/conversations — 新建对话
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { project_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    // 允许空 body
  }

  // 校验项目归属，避免越权关联
  let projectId: string | null = null;
  if (body.project_id) {
    const owned = await query<{ id: string }>(
      "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
      [body.project_id, session.user.id]
    );
    if (owned[0]) projectId = owned[0].id;
  }

  const inserted = await query<{
    id: string;
    title: string | null;
    project_id: string | null;
    updated_at: string;
  }>(
    `INSERT INTO conversations (user_id, project_id)
     VALUES ($1, $2)
     RETURNING id, title, project_id, updated_at`,
    [session.user.id, projectId]
  );

  return NextResponse.json(
    { conversation: inserted[0] },
    { status: 201 }
  );
}

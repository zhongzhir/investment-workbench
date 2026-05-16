import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/projects — 列出当前用户的所有项目（含最新报告状态）
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = await query(
    `SELECT p.id, p.name, p.company_name, p.industry, p.stage, p.status,
            p.created_at,
            r.id   AS latest_report_id,
            r.status AS latest_report_status
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT id, status FROM reports
          WHERE project_id = p.id
          ORDER BY updated_at DESC LIMIT 1
       ) r ON true
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC`,
    [session.user.id]
  );

  return NextResponse.json({ projects: rows });
}

// POST /api/projects — 创建项目
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: {
    name?: string;
    companyName?: string;
    industry?: string;
    stage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "请填写项目名称" }, { status: 400 });
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO projects (user_id, name, company_name, industry, stage)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      session.user.id,
      name,
      body.companyName?.trim() || null,
      body.industry?.trim() || null,
      body.stage?.trim() || null,
    ]
  );

  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}

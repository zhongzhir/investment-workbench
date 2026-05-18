import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { isValidStage } from "@/lib/stages";

// PATCH /api/projects/[id]/stage — 更新项目投资流程阶段
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { stage?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!isValidStage(body.stage)) {
    return NextResponse.json({ error: "阶段值不合法" }, { status: 422 });
  }

  const rows = await query<{
    id: string;
    name: string;
    process_stage: string;
    process_stage_updated_at: string;
  }>(
    `UPDATE projects
        SET process_stage = $1, process_stage_updated_at = NOW()
      WHERE id = $2 AND user_id = $3
      RETURNING id, name, process_stage, process_stage_updated_at`,
    [body.stage, params.id, session.user.id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  return NextResponse.json({ project: rows[0] });
}

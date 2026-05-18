import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { isValidStage } from "@/lib/stages";

interface JudgmentRow {
  id: string;
  stage: string;
  bull_case: string | null;
  bear_case: string | null;
  founder_assessment: string | null;
  key_hypothesis: string | null;
  confidence_level: number | null;
  created_at: string;
}

async function assertOwned(projectId: string, userId: string): Promise<boolean> {
  const owned = await query<{ id: string }>(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [projectId, userId]
  );
  return owned.length > 0;
}

// GET /api/projects/[id]/judgments — 该项目所有判断记录，按时间倒序
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!(await assertOwned(params.id, session.user.id))) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const rows = await query<JudgmentRow>(
    `SELECT id, stage, bull_case, bear_case, founder_assessment,
            key_hypothesis, confidence_level, created_at
       FROM investment_judgments
      WHERE project_id = $1 AND user_id = $2
      ORDER BY created_at DESC`,
    [params.id, session.user.id]
  );

  return NextResponse.json({ judgments: rows });
}

// POST /api/projects/[id]/judgments — 新增一条判断记录
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (!(await assertOwned(params.id, session.user.id))) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  let body: {
    stage?: string;
    bull_case?: string;
    bear_case?: string;
    founder_assessment?: string;
    key_hypothesis?: string;
    confidence_level?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  if (!isValidStage(body.stage)) {
    return NextResponse.json({ error: "阶段值不合法" }, { status: 422 });
  }

  let confidence: number | null = null;
  if (body.confidence_level != null) {
    const c = Number(body.confidence_level);
    if (!Number.isInteger(c) || c < 1 || c > 5) {
      return NextResponse.json({ error: "信心评分须为 1-5" }, { status: 422 });
    }
    confidence = c;
  }

  const norm = (v?: string) => {
    const t = v?.trim();
    return t ? t : null;
  };

  const rows = await query<JudgmentRow>(
    `INSERT INTO investment_judgments
       (user_id, project_id, stage, bull_case, bear_case,
        founder_assessment, key_hypothesis, confidence_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, stage, bull_case, bear_case, founder_assessment,
               key_hypothesis, confidence_level, created_at`,
    [
      session.user.id,
      params.id,
      body.stage,
      norm(body.bull_case),
      norm(body.bear_case),
      norm(body.founder_assessment),
      norm(body.key_hypothesis),
      confidence,
    ]
  );

  return NextResponse.json({ judgment: rows[0] }, { status: 201 });
}

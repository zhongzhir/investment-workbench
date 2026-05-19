import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { generateEmbedding } from "@/lib/embedding";

export const maxDuration = 60;

// POST /api/skills/save — 将 SKILL 运行结果保存到项目知识库
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    let body: { project_id?: string; content?: string; skill_name?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const content = body.content?.trim();
    const skillName = body.skill_name?.trim() || "SKILL 分析";
    if (!content) {
      return NextResponse.json({ error: "内容不能为空" }, { status: 422 });
    }

    // 校验项目归属（若指定了项目）
    let projectId: string | null = null;
    if (body.project_id) {
      const owned = await query<{ id: string }>(
        "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
        [body.project_id, session.user.id]
      );
      if (owned.length === 0) {
        return NextResponse.json({ error: "项目不存在" }, { status: 404 });
      }
      projectId = body.project_id;
    }

    // 生成 embedding（百炼未配置或失败则仅保留全文检索）
    let embeddingVector: number[] | null = null;
    let embeddingModel: string | null = null;
    const result = await generateEmbedding(content);
    if (result) {
      embeddingVector = result.vector;
      embeddingModel = result.model;
    }

    const metadata = { skill_name: skillName, run_at: new Date().toISOString() };
    const rows = await query<{ id: string }>(
      `INSERT INTO knowledge_base_entries
         (user_id, project_id, content, source_type, tags,
          embedding, embedding_model, metadata)
       VALUES ($1, $2, $3, 'skill_output', $4, $5, $6, $7)
       RETURNING id`,
      [
        session.user.id,
        projectId,
        content,
        JSON.stringify([skillName]),
        embeddingVector ? `[${embeddingVector.join(",")}]` : null,
        embeddingModel,
        JSON.stringify(metadata),
      ]
    );

    return NextResponse.json(
      { success: true, entryId: rows[0].id },
      { status: 201 }
    );
  } catch (e) {
    console.error("[skills/save] 失败:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "保存失败" },
      { status: 500 }
    );
  }
}

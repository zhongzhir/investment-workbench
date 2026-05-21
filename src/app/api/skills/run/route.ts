import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { streamChat } from "@/lib/ai";
import {
  loadUserAICredentials,
  streamTextResponse,
  freeQuotaMetaFor,
} from "@/lib/report";
import { injectProfile } from "@/lib/user-profile";
import { STAGE_LABELS } from "@/lib/stages";

export const maxDuration = 120;

interface JudgmentRow {
  stage: string;
  bull_case: string | null;
  bear_case: string | null;
  founder_assessment: string | null;
  key_hypothesis: string | null;
  confidence_level: number | null;
  created_at: string;
}

const EMPTY = "（未关联项目，无相关数据）";

// 组装关联项目的注入变量
async function buildProjectVars(
  projectId: string,
  userId: string
): Promise<Record<string, string> | null> {
  const projects = await query<{
    name: string;
    industry: string | null;
    summary: string | null;
    process_stage: string;
    financial_data: unknown;
  }>(
    `SELECT name, industry, summary, process_stage, financial_data
       FROM projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  if (projects.length === 0) return null;
  const p = projects[0];

  const projectInfo = [
    `项目名称：${p.name}`,
    `行业/赛道：${p.industry || "（未标注）"}`,
    `当前阶段：${STAGE_LABELS[p.process_stage] ?? p.process_stage}`,
    `项目概述：${p.summary || "（未填写）"}`,
  ].join("\n");

  const docs = await query<{ extracted_text: string | null }>(
    `SELECT extracted_text FROM documents
      WHERE project_id = $1 AND extracted_text IS NOT NULL
      ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  const bpContent = docs[0]?.extracted_text?.slice(0, 8000) || "（未上传文档）";

  const financialData = p.financial_data
    ? JSON.stringify(p.financial_data)
    : "（暂无财务数据）";

  const judgmentRows = await query<JudgmentRow>(
    `SELECT stage, bull_case, bear_case, founder_assessment,
            key_hypothesis, confidence_level, created_at
       FROM investment_judgments
      WHERE project_id = $1 AND user_id = $2
      ORDER BY created_at DESC`,
    [projectId, userId]
  );
  const judgments =
    judgmentRows.length === 0
      ? "（暂无判断记录）"
      : judgmentRows
          .map((j) => {
            const date = new Date(j.created_at).toLocaleDateString("zh-CN");
            const parts = [
              j.bull_case && `看好的理由：${j.bull_case}`,
              j.bear_case && `主要顾虑：${j.bear_case}`,
              j.founder_assessment && `对创始人的判断：${j.founder_assessment}`,
              j.key_hypothesis && `关键待验证假设：${j.key_hypothesis}`,
              j.confidence_level && `信心评分：${j.confidence_level}/5`,
            ].filter(Boolean);
            return `【${STAGE_LABELS[j.stage] ?? j.stage}·${date}】\n${
              parts.join("\n") || "（无具体内容）"
            }`;
          })
          .join("\n\n");

  return {
    project_info: projectInfo,
    bp_content: bpContent,
    financial_data: financialData,
    judgments,
  };
}

// POST /api/skills/run — 运行 SKILL（流式）
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: {
    skill_id?: string;
    skill_type?: string;
    project_id?: string;
    extra_input?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { skill_id, skill_type, project_id, extra_input } = body;
  if (!skill_id || (skill_type !== "catalog" && skill_type !== "custom")) {
    return NextResponse.json({ error: "参数不合法" }, { status: 422 });
  }

  // 1. 读取 SKILL 模板
  let promptTemplate: string;
  if (skill_type === "catalog") {
    const rows = await query<{ prompt_template: string }>(
      "SELECT prompt_template FROM skill_catalog WHERE id = $1 AND is_active = true",
      [skill_id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "SKILL 不存在" }, { status: 404 });
    }
    promptTemplate = rows[0].prompt_template;
  } else {
    const rows = await query<{ prompt_template: string }>(
      "SELECT prompt_template FROM user_custom_skills WHERE id = $1 AND user_id = $2",
      [skill_id, session.user.id]
    );
    if (rows.length === 0) {
      return NextResponse.json({ error: "SKILL 不存在" }, { status: 404 });
    }
    promptTemplate = rows[0].prompt_template;
  }

  const creds = await loadUserAICredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "尚未配置 API Key，请先在设置中保存" },
      { status: 400 }
    );
  }

  // 2. 注入变量
  let vars: Record<string, string> = {
    project_info: EMPTY,
    bp_content: EMPTY,
    financial_data: EMPTY,
    judgments: EMPTY,
  };
  if (project_id) {
    const projectVars = await buildProjectVars(project_id, session.user.id);
    if (!projectVars) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    vars = projectVars;
  }

  // 3. 替换所有 {变量} 占位符
  let prompt = promptTemplate;
  for (const [key, value] of Object.entries(vars)) {
    prompt = prompt.split(`{${key}}`).join(value);
  }
  if (extra_input?.trim()) {
    prompt += `\n\n## 投资人补充说明\n${extra_input.trim()}`;
  }

  // 4. 流式调用 AI
  const generator = streamChat({
    provider: creds.provider,
    apiKey: creds.apiKey,
    baseURL: creds.baseURL,
    freeQuotaMeta: freeQuotaMetaFor(creds, session.user.id, "skill-run"),
    system: await injectProfile(
      session.user.id,
      "你是一位资深的一级股权投资专家，输出使用简体中文与 Markdown 格式，专业、具体、有洞察力。"
    ),
    messages: [{ role: "user", content: prompt }],
  });

  return streamTextResponse(generator, async () => {});
}

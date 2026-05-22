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
import { stripSourceBadges } from "@/lib/reportBadges";
import { extractConfidence } from "@/lib/reportConfidence";

export const maxDuration = 120;

interface ReportRow {
  id: string;
  title: string;
  content: string | null;
}

const MERGE_SYSTEM = `你是一位资深投资分析师，正在为投资决策委员会（投委会）撰写一份总报告。
你会收到同一个项目的多份已有分析报告（可能来自不同的分析框架 / SKILL / 阶段）。
请把它们整合、去重、调和冲突，提炼为一份连贯、结论导向的投委会总报告。

要求：
- 使用简体中文，专业、客观、有洞察力。
- 输出 Markdown，严格包含以下七个二级标题章节，顺序固定，使用「## 」：
  ## 执行摘要
  ## 项目概况
  ## 市场与竞争
  ## 团队评估
  ## 财务分析
  ## 风险与挑战
  ## 投资建议
- 综合多份报告的信息：消除重复表述；若不同报告存在矛盾，明确指出并给出倾向性判断。
- 「执行摘要」用 5 条以内要点概括核心结论与投资建议。
- 「投资建议」给出明确倾向（投 / 观望 / 不投）与关键前提条件。
- 不要编造源报告中不存在的数据；信息缺失处注明「源报告未覆盖」。
- 各章节用自然段落，必要时配合要点列表，避免空话套话。
- 直接输出报告正文，不要任何额外说明或开场白。`;

function buildMergeUserContent(reports: ReportRow[]): string {
  const parts = reports.map((r, i) => {
    // 去掉源报告的溯源徽章与置信度 JSON 块，给 AI 更干净的输入
    const clean = stripSourceBadges(
      extractConfidence(r.content ?? "").cleanContent
    ).trim();
    return `### 源报告 ${i + 1}：${r.title}\n\n${clean || "（无内容）"}`;
  });
  return `## 待合并的源报告（共 ${reports.length} 份）

${parts.join("\n\n---\n\n")}

请将以上分析整合为一份投委会总报告。`;
}

// POST /api/projects/[id]/reports/merge — 多报告合并生成投委会总报告（流式）
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { reportIds?: unknown; title?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const reportIds = Array.isArray(body.reportIds)
    ? body.reportIds.filter((x): x is string => typeof x === "string" && !!x)
    : [];
  if (reportIds.length < 2) {
    return NextResponse.json(
      { error: "请至少选择 2 份报告进行合并" },
      { status: 400 }
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "投委会分析报告";

  const creds = await loadUserAICredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "尚未配置 API Key，请先在设置中保存" },
      { status: 400 }
    );
  }

  // 校验项目归属
  const projects = await query<{ id: string }>(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [params.id, session.user.id]
  );
  if (projects.length === 0) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  // 读取选中的报告，并确保都属于本项目本人
  const rows = await query<ReportRow>(
    `SELECT id, title, content
       FROM reports
      WHERE id = ANY($1::uuid[]) AND project_id = $2 AND user_id = $3`,
    [reportIds, params.id, session.user.id]
  );
  if (rows.length < 2) {
    return NextResponse.json(
      { error: "选中的报告不足 2 份有效记录（可能不属于该项目）" },
      { status: 400 }
    );
  }

  // 按用户选择顺序排序，并过滤掉无正文的报告
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = reportIds
    .map((id) => byId.get(id))
    .filter((r): r is ReportRow => !!r && !!r.content && !!r.content.trim());
  if (ordered.length < 2) {
    return NextResponse.json(
      { error: "选中的报告正文内容不足，无法合并" },
      { status: 400 }
    );
  }

  // 先创建占位报告行，便于把 reportId 通过响应头返回；生成完成后置为 finalized
  const created = await query<{ id: string }>(
    `INSERT INTO reports (project_id, user_id, title, content, status)
     VALUES ($1, $2, $3, '', 'draft')
     RETURNING id`,
    [params.id, session.user.id, `【总报告】${title}`]
  );
  const reportId = created[0].id;

  const generator = streamChat({
    provider: creds.provider,
    apiKey: creds.apiKey,
    baseURL: creds.baseURL,
    freeQuotaMeta: freeQuotaMetaFor(creds, session.user.id, "report-merge"),
    system: await injectProfile(session.user.id, MERGE_SYSTEM),
    messages: [{ role: "user", content: buildMergeUserContent(ordered) }],
  });

  const res = streamTextResponse(generator, async (fullText) => {
    await query(
      "UPDATE reports SET content = $1, status = 'finalized' WHERE id = $2",
      [fullText, reportId]
    );
  });
  res.headers.set("X-Report-Id", reportId);
  return res;
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { streamChat } from "@/lib/ai";
import { loadUserAICredentials } from "@/lib/report";
import type { FinancialData } from "@/lib/types";

export const maxDuration = 120;

const SYSTEM_PROMPT = `你是专业的财务分析师。请从以下商业计划书文本中提取所有财务相关数据，
输出严格的JSON格式，不要输出任何其他内容。

输出格式：
{
  "revenue": [{"year": "2022", "value": 1200, "unit": "万元"}],
  "growth_rate": [{"year": "2023", "value": 80, "unit": "%"}],
  "gross_margin": [{"year": "2022", "value": 45, "unit": "%"}],
  "users": [{"year": "2022", "value": 50, "unit": "万"}],
  "valuation": [{"round": "A轮", "value": 2, "unit": "亿元"}],
  "funding_history": [{"round": "天使轮", "amount": 500, "unit": "万元", "year": "2021"}],
  "key_metrics": [{"name": "月活用户", "value": "120万", "date": "2024Q1"}],
  "summary": "一段100字以内的财务状况总结"
}

如果某项数据不存在，返回空数组[]。数值统一转为数字类型，不要带单位在value里。`;

const EMPTY: FinancialData = {
  revenue: [],
  growth_rate: [],
  gross_margin: [],
  users: [],
  valuation: [],
  funding_history: [],
  key_metrics: [],
  summary: "",
};

// 从 AI 输出中提取 JSON（容忍 ```json 代码块包裹与前后噪声）。
function extractJson(text: string): FinancialData {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI 未返回有效 JSON");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  return {
    ...EMPTY,
    ...parsed,
    revenue: Array.isArray(parsed.revenue) ? parsed.revenue : [],
    growth_rate: Array.isArray(parsed.growth_rate) ? parsed.growth_rate : [],
    gross_margin: Array.isArray(parsed.gross_margin)
      ? parsed.gross_margin
      : [],
    users: Array.isArray(parsed.users) ? parsed.users : [],
    valuation: Array.isArray(parsed.valuation) ? parsed.valuation : [],
    funding_history: Array.isArray(parsed.funding_history)
      ? parsed.funding_history
      : [],
    key_metrics: Array.isArray(parsed.key_metrics) ? parsed.key_metrics : [],
    summary: typeof parsed.summary === "string" ? parsed.summary : "",
  };
}

// POST /api/projects/[id]/financials — 从 BP 提取结构化财务数据
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const projects = await query<{ id: string }>(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [params.id, session.user.id]
  );
  if (projects.length === 0) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  const creds = await loadUserAICredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "尚未配置 API Key，请先在设置中保存" },
      { status: 400 }
    );
  }

  const docs = await query<{ extracted_text: string | null }>(
    `SELECT extracted_text FROM documents
      WHERE project_id = $1 AND extracted_text IS NOT NULL
      ORDER BY created_at ASC`,
    [params.id]
  );
  const bpText = docs
    .map((d) => d.extracted_text)
    .filter(Boolean)
    .join("\n\n---\n\n");
  if (!bpText) {
    return NextResponse.json(
      { error: "该项目尚未上传可解析的 BP 文档" },
      { status: 400 }
    );
  }

  // 收集完整 AI 输出
  let raw = "";
  try {
    for await (const chunk of streamChat({
      provider: creds.provider,
      apiKey: creds.apiKey,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: bpText }],
    })) {
      raw += chunk;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 调用失败";
    return NextResponse.json({ error: `财务数据提取失败：${msg}` }, {
      status: 502,
    });
  }

  let financialData: FinancialData;
  try {
    financialData = extractJson(raw);
  } catch {
    return NextResponse.json(
      { error: "AI 返回的财务数据无法解析，请重试" },
      { status: 502 }
    );
  }

  await query("UPDATE projects SET financial_data = $1 WHERE id = $2", [
    JSON.stringify(financialData),
    params.id,
  ]);

  return NextResponse.json({ financialData });
}

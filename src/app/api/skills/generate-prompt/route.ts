import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { streamChat } from "@/lib/ai";
import { loadUserAICredentials, freeQuotaMetaFor } from "@/lib/report";
import { injectProfile } from "@/lib/user-profile";

export const maxDuration = 60;

const SKILL_GEN_SYSTEM = `你是一个投资分析 prompt 工程师。
用户会描述他想要的投资分析方向，你需要生成一个高质量的分析 prompt。

要求：
- prompt 应以"请基于上传的项目材料，"开头
- 结构清晰，分析维度具体
- 适合一级股权投资场景
- 长度 200-400 字
- 直接输出 prompt 内容，不要有任何解释或前缀`;

// POST /api/skills/generate-prompt
// body: { description: string }
// 返回 { prompt: string }（非流式）
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) {
    return NextResponse.json({ error: "请输入分析方向描述" }, { status: 422 });
  }

  const creds = await loadUserAICredentials(session.user.id);
  if (!creds) {
    return NextResponse.json(
      { error: "请先在设置中配置 API Key" },
      { status: 400 }
    );
  }

  let prompt = "";
  try {
    for await (const chunk of streamChat({
      provider: creds.provider,
      apiKey: creds.apiKey,
      baseURL: creds.baseURL,
      freeQuotaMeta: freeQuotaMetaFor(creds, session.user.id, "skill-gen-prompt"),
      system: await injectProfile(session.user.id, SKILL_GEN_SYSTEM),
      messages: [
        {
          role: "user",
          content: `我想要一个分析「${description}」的投资分析 SKILL，请生成 prompt。`,
        },
      ],
    })) {
      prompt += chunk;
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 调用失败" },
      { status: 500 }
    );
  }

  return NextResponse.json({ prompt: prompt.trim() });
}

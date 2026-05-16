import { type AIProvider, type ChatMessage, isValidProvider } from "@/lib/ai";
import { decrypt } from "@/lib/crypto";
import { query } from "@/lib/db";

// 报告生成 / 修改的 prompt 构建与流式响应工具。

const GENERATION_SYSTEM = `你是一位资深的一级股权投资分析师。请基于用户提供的项目 BP 内容与投资人的判断要点，撰写一份结构化的《项目分析报告》。

要求：
- 使用简体中文，专业、客观、有洞察力。
- 输出 Markdown 格式，严格包含以下七个一级标题章节，顺序固定：
  # 项目概览
  # 市场机会分析
  # 商业模式分析
  # 团队评估
  # 投资人判断
  # 风险提示
  # 初步结论
- 「项目概览」需点明公司名称、所处行业、融资阶段、核心业务。
- 「投资人判断」章节须逐条回应用户输入的判断要点，结合 BP 事实给出印证或质疑。
- 若 BP 中信息不足，明确指出「BP 未披露」，不要编造数据。
- 各章节正文用自然段落，必要时用要点列表，避免空话套话。`;

const REFINE_SYSTEM = `你是一位资深投资分析师，正在根据用户的修改指令完善一份《项目分析报告》。

要求：
- 理解用户的自然语言修改指令，只调整相关部分，其余内容尽量保持不变。
- 返回【完整的】修改后报告（Markdown），不要只返回被修改的片段，不要附加说明文字。
- 保持原有的七章节结构与 Markdown 格式。`;

export function buildGenerationMessages(params: {
  projectName: string;
  companyName?: string | null;
  industry?: string | null;
  stage?: string | null;
  bpText: string;
  judgmentPoints: string[];
}): { system: string; messages: ChatMessage[] } {
  const points = params.judgmentPoints
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");

  const userContent = `## 项目基本信息
- 项目名称：${params.projectName}
- 公司主体：${params.companyName || "（待补充）"}
- 行业：${params.industry || "（待补充）"}
- 融资阶段：${params.stage || "（待补充）"}

## 投资人判断要点
${points || "（用户未填写）"}

## 项目 BP 原文（解析自上传文档）
${params.bpText || "（未提供 BP 文本）"}

请据此撰写完整的项目分析报告。`;

  return {
    system: GENERATION_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  };
}

export function buildRefineMessages(params: {
  currentReport: string;
  instruction: string;
}): { system: string; messages: ChatMessage[] } {
  const userContent = `## 当前报告内容
${params.currentReport}

## 修改指令
${params.instruction}

请输出修改后的完整报告。`;

  return {
    system: REFINE_SYSTEM,
    messages: [{ role: "user", content: userContent }],
  };
}

// 从数据库读取并解密用户存储的 AI 凭据。
export async function loadUserAICredentials(
  userId: string
): Promise<{ provider: AIProvider; apiKey: string } | null> {
  const rows = await query<{
    api_key_encrypted: string | null;
    ai_provider: string | null;
  }>("SELECT api_key_encrypted, ai_provider FROM users WHERE id = $1", [
    userId,
  ]);
  const row = rows[0];
  if (!row?.api_key_encrypted) return null;

  const provider: AIProvider =
    row.ai_provider && isValidProvider(row.ai_provider)
      ? row.ai_provider
      : "deepseek";
  try {
    return { provider, apiKey: decrypt(row.api_key_encrypted) };
  } catch {
    return null;
  }
}

// 把 AI 文本增量流包装为 HTTP 流式响应；流结束后执行 onComplete 持久化。
export function streamTextResponse(
  generator: AsyncGenerator<string>,
  onComplete: (fullText: string) => Promise<void>
): Response {
  const encoder = new TextEncoder();
  let full = "";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of generator) {
          full += chunk;
          controller.enqueue(encoder.encode(chunk));
        }
        await onComplete(full);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "未知错误";
        controller.enqueue(encoder.encode(`\n\n> [生成中断] ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

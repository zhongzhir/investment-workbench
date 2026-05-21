import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { streamChat, isValidProvider } from "@/lib/ai";

export const maxDuration = 15;

// POST /api/settings/test-connection
// body: { provider, apiKey, baseUrl? }
// 用传入的 Key 做一次最短调用，验证可达性。不读不写数据库。
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "未登录" }, { status: 401 });
  }

  let body: { provider?: string; apiKey?: string; baseUrl?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求格式错误" },
      { status: 400 }
    );
  }

  const provider = body.provider?.trim();
  const apiKey = body.apiKey?.trim();
  if (!provider || !isValidProvider(provider)) {
    return NextResponse.json(
      { ok: false, error: "不支持的服务商" },
      { status: 400 }
    );
  }
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "缺少 API Key" },
      { status: 400 }
    );
  }

  // 8 秒超时
  const TIMEOUT_MS = 8000;
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error("连接超时，请检查网络或 Base URL")),
      TIMEOUT_MS
    )
  );

  const probe = async () => {
    let received = "";
    for await (const chunk of streamChat({
      provider,
      apiKey,
      baseURL: body.baseUrl?.trim() || undefined,
      system: "回复一个字。",
      messages: [{ role: "user", content: "hi" }],
    })) {
      received += chunk;
      // 拿到任意输出就算连接成功；立即结束（节省 token）
      if (received.length > 0) break;
    }
    return received;
  };

  try {
    const text = await Promise.race([probe(), timeoutPromise]);
    return NextResponse.json({
      ok: true,
      sample: (text as string).slice(0, 50),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "连接失败";
    // 简化常见错误为可读信息
    const friendly = simplifyError(msg);
    return NextResponse.json({ ok: false, error: friendly }, { status: 200 });
  }
}

function simplifyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("401") || lower.includes("unauthorized") || lower.includes("invalid api key")) {
    return "API Key 无效或已过期";
  }
  if (lower.includes("403") || lower.includes("forbidden")) {
    return "API Key 无权访问该服务";
  }
  if (lower.includes("insufficient") || lower.includes("balance") || lower.includes("quota")) {
    return "余额 / 配额不足";
  }
  if (lower.includes("timeout") || lower.includes("超时")) {
    return "连接超时，请检查网络或 Base URL";
  }
  if (lower.includes("enotfound") || lower.includes("dns")) {
    return "无法解析服务地址，请检查 Base URL";
  }
  if (lower.includes("model") && lower.includes("not")) {
    return "默认模型不可用，请确认账号已开通对应模型";
  }
  return raw.slice(0, 200);
}

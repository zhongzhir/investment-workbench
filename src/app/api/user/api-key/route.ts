import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { decrypt, encrypt, maskKey } from "@/lib/crypto";
import { isValidProvider } from "@/lib/ai";

interface UserKeyRow {
  api_key_encrypted: string | null;
  ai_provider: string | null;
}

// GET /api/user/api-key — 返回当前用户的 API Key（脱敏）与服务商
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = await query<UserKeyRow>(
    "SELECT api_key_encrypted, ai_provider FROM users WHERE id = $1",
    [session.user.id]
  );
  const row = rows[0];
  const provider = row?.ai_provider || "deepseek";

  let maskedKey: string | null = null;
  if (row?.api_key_encrypted) {
    try {
      maskedKey = maskKey(decrypt(row.api_key_encrypted));
    } catch {
      // 解密失败（如更换过 ENCRYPTION_KEY）：视作未配置
      maskedKey = null;
    }
  }

  return NextResponse.json({
    configured: maskedKey !== null,
    maskedKey,
    provider,
  });
}

// POST /api/user/api-key — 加密保存 API Key 与服务商
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { apiKey?: string; provider?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const provider = body.provider?.trim() || "";
  if (!isValidProvider(provider)) {
    return NextResponse.json({ error: "不支持的服务商" }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (apiKey) {
    // 同时更新 Key 与服务商
    await query(
      "UPDATE users SET api_key_encrypted = $1, ai_provider = $2 WHERE id = $3",
      [encrypt(apiKey), provider, session.user.id]
    );
  } else {
    // 仅更新服务商，保留原有 Key
    await query("UPDATE users SET ai_provider = $1 WHERE id = $2", [
      provider,
      session.user.id,
    ]);
  }

  return NextResponse.json({ ok: true, provider });
}

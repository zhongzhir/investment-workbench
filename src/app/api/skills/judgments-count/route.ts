import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

// GET /api/skills/judgments-count — 当前用户的 investment_judgments 总数
// 用于「从历史判断生成 SKILL」入口的可用性判断（< 5 时灰显）
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ count: 0 });
  }
  try {
    const rows = await query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM investment_judgments WHERE user_id = $1",
      [session.user.id]
    );
    const count = Number(rows[0]?.count ?? 0);
    return NextResponse.json({ count });
  } catch (e) {
    console.error("[judgments-count] 失败:", e);
    return NextResponse.json({ count: 0 });
  }
}

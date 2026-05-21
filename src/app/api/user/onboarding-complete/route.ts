import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

// POST /api/user/onboarding-complete — 把当前用户的 onboarding_completed 置 true
export async function POST() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    await query(
      "UPDATE users SET onboarding_completed = TRUE WHERE id = $1",
      [session.user.id]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    // 字段不存在时（迁移未跑）静默成功 —— 弹窗在本次会话已关闭，不阻塞用户
    console.error("[onboarding-complete] 更新失败:", e);
    return NextResponse.json({ success: true, warning: "迁移未应用" });
  }
}

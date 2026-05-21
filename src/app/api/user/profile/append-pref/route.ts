import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

const MAX_PREF_LEN = 200;
const MAX_EXTRA_CONTEXT_LEN = 4000;

// POST /api/user/profile/append-pref
// body: { pref: string }
// 把新捕获的偏好以「- {pref}」追加到 user_profiles.extra_context。
// 若用户尚无 profile 行则创建一行。
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: { pref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const pref = body.pref?.trim();
  if (!pref) {
    return NextResponse.json({ error: "偏好不能为空" }, { status: 422 });
  }
  const safe = pref.slice(0, MAX_PREF_LEN);

  try {
    const rows = await query<{ extra_context: string | null }>(
      "SELECT extra_context FROM user_profiles WHERE user_id = $1",
      [session.user.id]
    );
    const existing = rows[0]?.extra_context ?? "";
    const merged = (existing ? `${existing}\n` : "") + `- ${safe}`;
    const trimmed = merged.slice(-MAX_EXTRA_CONTEXT_LEN);

    if (rows[0]) {
      await query(
        `UPDATE user_profiles
            SET extra_context = $1, updated_at = NOW()
          WHERE user_id = $2`,
        [trimmed, session.user.id]
      );
    } else {
      await query(
        `INSERT INTO user_profiles (user_id, extra_context)
         VALUES ($1, $2)`,
        [session.user.id, trimmed]
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[append-pref] 失败:", e);
    return NextResponse.json({ error: "保存失败" }, { status: 500 });
  }
}

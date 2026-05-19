import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  isValidPhone,
  verifyPhoneCode,
  findOrCreatePhoneUser,
} from "@/lib/authUtils";

// POST /api/auth/verify-phone — 校验手机验证码
//   purpose=login：校验并消费验证码，返回该手机号对应用户
//   purpose=register：仅校验有效性（不消费），供前端继续填写注册信息
export async function POST(req: Request) {
  try {
    let body: { phone?: string; code?: string; purpose?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const phone = body.phone?.trim();
    const code = body.code?.trim();
    const purpose = body.purpose === "register" ? "register" : "login";
    if (!phone || !isValidPhone(phone) || !code) {
      return NextResponse.json({ error: "手机号或验证码不正确" }, { status: 400 });
    }

    if (purpose === "login") {
      const ok = await verifyPhoneCode(phone, code, "login", true);
      if (!ok) {
        return NextResponse.json(
          { error: "验证码无效或已过期" },
          { status: 400 }
        );
      }
      // 手机号未注册时静默创建账号，登录即注册一步完成
      const user = await findOrCreatePhoneUser(phone);
      return NextResponse.json({
        ok: true,
        user: { id: user.id, name: user.name },
      });
    }

    // purpose === "register"：仅校验，不消费（注册路由会再次校验并消费）
    const ok = await verifyPhoneCode(phone, code, "register", false);
    if (!ok) {
      return NextResponse.json(
        { error: "验证码无效或已过期" },
        { status: 400 }
      );
    }
    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE phone = $1",
      [phone]
    );
    if (existing.length > 0) {
      return NextResponse.json({ error: "该手机号已注册" }, { status: 409 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[verify-phone] 失败:", err);
    return NextResponse.json(
      { error: "校验失败，请稍后重试" },
      { status: 500 }
    );
  }
}

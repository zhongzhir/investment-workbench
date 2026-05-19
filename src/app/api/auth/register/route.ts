import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import {
  validatePassword,
  isValidEmail,
  isValidPhone,
  verifyPhoneCode,
} from "@/lib/authUtils";

// 注册：支持「邮箱+密码」与「手机号+验证码」两种方式。
// 注册成功不自动登录，由前端引导用户去登录页。
export async function POST(req: Request) {
  try {
    let body: {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
      code?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "请填写姓名" }, { status: 400 });
    }

    // —— 手机号注册 ——
    if (body.phone) {
      const phone = body.phone.trim();
      const code = body.code?.trim();
      if (!isValidPhone(phone)) {
        return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
      }
      if (!code) {
        return NextResponse.json({ error: "请输入验证码" }, { status: 400 });
      }
      const ok = await verifyPhoneCode(phone, code, "register", true);
      if (!ok) {
        return NextResponse.json(
          { error: "验证码无效或已过期" },
          { status: 400 }
        );
      }

      const inserted = await query<{ id: string }>(
        `INSERT INTO users (name, phone, auth_provider)
         VALUES ($1, $2, 'phone')
         ON CONFLICT (phone) DO NOTHING
         RETURNING id`,
        [name, phone]
      );
      if (inserted.length === 0) {
        return NextResponse.json({ error: "该手机号已注册" }, { status: 409 });
      }
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // —— 邮箱+密码注册 ——
    const email = body.email?.toLowerCase().trim();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json({ error: "请填写完整信息" }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    }
    const pwError = validatePassword(password);
    if (pwError) {
      return NextResponse.json({ error: pwError }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // ON CONFLICT DO NOTHING + RETURNING：原子化处理重复注册竞态
    const inserted = await query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, auth_provider)
       VALUES ($1, $2, $3, 'credentials')
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [name, email, passwordHash]
    );
    if (inserted.length === 0) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 409 });
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[register] 注册失败:", err);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
}

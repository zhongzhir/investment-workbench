// 认证相关的共享校验工具。

import { query } from "@/lib/db";

// 密码强度校验：至少 8 位，且同时包含字母与数字。
// 通过返回 null，不通过返回错误提示。
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "密码至少 8 位";
  if (!/[a-zA-Z]/.test(pw)) return "密码需包含字母";
  if (!/\d/.test(pw)) return "密码需包含数字";
  return null;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 中国大陆手机号：1 开头共 11 位数字。
export function isValidPhone(phone: string): boolean {
  return /^1\d{10}$/.test(phone);
}

export interface PhoneUser {
  id: string;
  email: string | null;
  name: string;
  image_url: string | null;
}

// 按手机号查找用户，不存在则静默创建（手机号登录的自动注册）。
// 默认 name 取手机号后四位，email 为 null，auth_provider 为 'phone'。
export async function findOrCreatePhoneUser(phone: string): Promise<PhoneUser> {
  const existing = await query<PhoneUser>(
    "SELECT id, email, name, image_url FROM users WHERE phone = $1",
    [phone]
  );
  if (existing[0]) return existing[0];

  const name = `用户${phone.slice(-4)}`;
  const created = await query<PhoneUser>(
    `INSERT INTO users (name, phone, auth_provider)
     VALUES ($1, $2, 'phone')
     ON CONFLICT (phone) DO NOTHING
     RETURNING id, email, name, image_url`,
    [name, phone]
  );
  if (created[0]) return created[0];

  // 并发创建：唯一约束兜底，重新查询
  const again = await query<PhoneUser>(
    "SELECT id, email, name, image_url FROM users WHERE phone = $1",
    [phone]
  );
  if (again[0]) return again[0];
  throw new Error("创建手机号用户失败");
}

// 校验手机验证码是否有效（存在、未使用、未过期、手机号与用途匹配）。
// consume=true 时校验通过后将其标记为已使用。
export async function verifyPhoneCode(
  phone: string,
  code: string,
  purpose: string,
  consume: boolean
): Promise<boolean> {
  const rows = await query<{ id: string }>(
    `SELECT id FROM phone_verify_codes
      WHERE phone = $1 AND code = $2 AND purpose = $3
        AND used_at IS NULL AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1`,
    [phone, code, purpose]
  );
  if (rows.length === 0) return false;
  if (consume) {
    await query(
      "UPDATE phone_verify_codes SET used_at = NOW() WHERE id = $1",
      [rows[0].id]
    );
  }
  return true;
}

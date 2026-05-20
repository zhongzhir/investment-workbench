import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import type { UserProfile, InvestmentStyle } from "@/lib/user-profile";
import { getUserProfile } from "@/lib/user-profile";

const VALID_STYLES: InvestmentStyle[] = [
  "financial",
  "strategic",
  "founder_first",
  "thesis_driven",
];

function sanitizeStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 32);
}

function sanitizeText(v: unknown, max = 2000): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

// GET /api/user/profile — 返回当前用户的投资人画像，未填写时返回 null
export async function GET() {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  const profile = await getUserProfile(session.user.id);
  return NextResponse.json({ profile });
}

// PUT /api/user/profile — UPSERT 当前用户的投资人画像
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: Partial<UserProfile>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const styleRaw = sanitizeText(body.investment_style, 32);
  const investment_style: InvestmentStyle | null =
    styleRaw && VALID_STYLES.includes(styleRaw as InvestmentStyle)
      ? (styleRaw as InvestmentStyle)
      : null;

  const params = [
    session.user.id,
    sanitizeStringArray(body.focus_stages),
    sanitizeStringArray(body.focus_sectors),
    investment_style,
    sanitizeText(body.check_size, 50),
    sanitizeText(body.typical_hold_period, 50),
    sanitizeText(body.self_intro),
    sanitizeText(body.decision_criteria),
    sanitizeText(body.avoid_patterns),
    sanitizeText(body.output_preference),
    sanitizeText(body.extra_context),
  ];

  await query(
    `INSERT INTO user_profiles (
        user_id, focus_stages, focus_sectors, investment_style,
        check_size, typical_hold_period, self_intro, decision_criteria,
        avoid_patterns, output_preference, extra_context
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT (user_id) DO UPDATE SET
        focus_stages = EXCLUDED.focus_stages,
        focus_sectors = EXCLUDED.focus_sectors,
        investment_style = EXCLUDED.investment_style,
        check_size = EXCLUDED.check_size,
        typical_hold_period = EXCLUDED.typical_hold_period,
        self_intro = EXCLUDED.self_intro,
        decision_criteria = EXCLUDED.decision_criteria,
        avoid_patterns = EXCLUDED.avoid_patterns,
        output_preference = EXCLUDED.output_preference,
        extra_context = EXCLUDED.extra_context,
        updated_at = NOW()`,
    params
  );

  const profile = await getUserProfile(session.user.id);
  return NextResponse.json({ profile });
}

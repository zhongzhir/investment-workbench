import { query } from "@/lib/db";

// 投资人画像：用户的专业方向与判断偏好。
// 调用大模型前会被格式化并前置注入到 system prompt，
// 让 AI 输出更贴合个人风格。

export type InvestmentStyle =
  | "financial"
  | "strategic"
  | "founder_first"
  | "thesis_driven";

export interface UserProfile {
  user_id: string;
  focus_stages: string[];
  focus_sectors: string[];
  investment_style: InvestmentStyle | null;
  check_size: string | null;
  typical_hold_period: string | null;
  self_intro: string | null;
  decision_criteria: string | null;
  avoid_patterns: string | null;
  output_preference: string | null;
  extra_context: string | null;
}

const STYLE_LABEL: Record<InvestmentStyle, string> = {
  financial: "财务回报导向",
  strategic: "战略布局导向",
  founder_first: "Founder 优先",
  thesis_driven: "主题投资",
};

export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  const rows = await query<UserProfile>(
    `SELECT user_id, focus_stages, focus_sectors, investment_style,
            check_size, typical_hold_period, self_intro, decision_criteria,
            avoid_patterns, output_preference, extra_context
       FROM user_profiles WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

// 将画像格式化为自然语言段落，注入到 system prompt 最前面。
// 字段为空则跳过对应行，避免输出空白条目。
export function formatProfileForPrompt(profile: UserProfile): string {
  const lines: string[] = ["## 关于这位投资人"];

  if (profile.focus_stages?.length) {
    lines.push(`专注阶段：${profile.focus_stages.join("、")}`);
  }
  if (profile.focus_sectors?.length) {
    lines.push(`关注赛道：${profile.focus_sectors.join("、")}`);
  }
  if (profile.investment_style) {
    lines.push(`投资风格：${STYLE_LABEL[profile.investment_style]}`);
  }
  if (profile.check_size) {
    lines.push(`单笔规模：${profile.check_size}`);
  }
  if (profile.typical_hold_period) {
    lines.push(`典型持有周期：${profile.typical_hold_period}`);
  }
  if (profile.decision_criteria) {
    lines.push(`核心判断标准：${profile.decision_criteria}`);
  }
  if (profile.avoid_patterns) {
    lines.push(`明确回避：${profile.avoid_patterns}`);
  }
  if (profile.output_preference) {
    lines.push(`输出偏好：${profile.output_preference}`);
  }
  if (profile.self_intro) {
    lines.push(`补充背景：${profile.self_intro}`);
  }
  if (profile.extra_context) {
    lines.push(`其他补充：${profile.extra_context}`);
  }

  // 只有标题行说明没有任何字段填写
  if (lines.length === 1) return "";
  return lines.join("\n");
}

// 在原 system prompt 前注入投资人画像；查询失败静默降级。
export async function injectProfile(
  userId: string,
  originalSystem: string
): Promise<string> {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return originalSystem;
    const section = formatProfileForPrompt(profile);
    if (!section) return originalSystem;
    return `${section}\n\n---\n\n${originalSystem}`;
  } catch {
    return originalSystem;
  }
}

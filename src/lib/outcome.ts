// 项目投资结果（outcome）定义（前后端共用）

export interface OutcomeDef {
  value: string;
  label: string;
  icon: string;
  badgeClass: string;
}

export const OUTCOMES: OutcomeDef[] = [
  { value: "pending", label: "待定", icon: "", badgeClass: "bg-surface text-ink-faint" },
  { value: "invested", label: "已投资", icon: "✅", badgeClass: "bg-green-100 text-green-700" },
  { value: "passed", label: "已Pass", icon: "❌", badgeClass: "bg-line text-ink-soft" },
  { value: "exited_profit", label: "已退出（盈利）", icon: "📈", badgeClass: "bg-blue-100 text-blue-700" },
  { value: "exited_loss", label: "已退出（亏损）", icon: "📉", badgeClass: "bg-red-100 text-red-700" },
];

export const OUTCOME_VALUES = OUTCOMES.map((o) => o.value);

export function isValidOutcome(v: unknown): v is string {
  return typeof v === "string" && OUTCOME_VALUES.includes(v);
}

export function outcomeDef(value: string | null | undefined): OutcomeDef {
  return OUTCOMES.find((o) => o.value === value) ?? OUTCOMES[0];
}

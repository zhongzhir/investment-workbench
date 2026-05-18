// 投后管理常量（前后端共用）

export const MEETING_TYPES = [
  { value: "regular", label: "常规" },
  { value: "board", label: "董事会" },
  { value: "emergency", label: "紧急" },
  { value: "annual", label: "年会" },
] as const;

export const MEETING_TYPE_VALUES = MEETING_TYPES.map((m) => m.value);

export function meetingTypeLabel(v: string): string {
  return MEETING_TYPES.find((m) => m.value === v)?.label ?? v;
}

export function isValidMeetingType(v: unknown): v is string {
  return (
    typeof v === "string" &&
    (MEETING_TYPE_VALUES as readonly string[]).includes(v)
  );
}

export interface UpdateTypeDef {
  icon: string;
  label: string;
  badgeClass: string;
}

// 投后跟踪更新类型
export const UPDATE_TYPE_CONFIG: Record<string, UpdateTypeDef> = {
  regular: { icon: "📋", label: "常规更新", badgeClass: "bg-line text-ink-soft" },
  milestone: { icon: "🎯", label: "里程碑", badgeClass: "bg-green-100 text-green-700" },
  risk: { icon: "⚠️", label: "风险预警", badgeClass: "bg-red-100 text-red-700" },
  financing: { icon: "💰", label: "融资进展", badgeClass: "bg-blue-100 text-blue-700" },
  personnel: { icon: "👥", label: "人员变动", badgeClass: "bg-orange-100 text-orange-700" },
  exit: { icon: "🚪", label: "退出相关", badgeClass: "bg-purple-100 text-purple-700" },
};

export const UPDATE_TYPE_VALUES = Object.keys(UPDATE_TYPE_CONFIG);

export function updateTypeDef(v: string): UpdateTypeDef {
  return UPDATE_TYPE_CONFIG[v] ?? UPDATE_TYPE_CONFIG.regular;
}

export function isValidUpdateType(v: unknown): v is string {
  return typeof v === "string" && UPDATE_TYPE_VALUES.includes(v);
}

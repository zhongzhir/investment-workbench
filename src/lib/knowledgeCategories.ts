// 知识库文件分类标签（前后端共用）

export const KNOWLEDGE_CATEGORIES = [
  { value: "bp", label: "项目BP" },
  { value: "due_diligence", label: "尽调纪要" },
  { value: "investment_decision", label: "投资决策" },
  { value: "industry_research", label: "行业研究" },
  { value: "post_investment", label: "投后管理" },
  { value: "personal_insight", label: "个人洞察" },
] as const;

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]["value"];

export function isValidCategory(value: unknown): value is KnowledgeCategory {
  return (
    typeof value === "string" &&
    KNOWLEDGE_CATEGORIES.some((c) => c.value === value)
  );
}

export function categoryLabel(value: string): string {
  return KNOWLEDGE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

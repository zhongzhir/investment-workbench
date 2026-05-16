// 核心领域类型，与 db/schema.sql 对应

export type Plan = "personal" | "pro" | "team";
export type AIProvider = "deepseek" | "claude" | "qwen";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  preferredProvider: AIProvider;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus = "evaluating" | "invested" | "passed" | "exited";

export interface Project {
  id: string;
  userId: string;
  name: string;
  companyName: string | null;
  industry: string | null;
  stage: string | null;
  status: ProjectStatus;
  judgmentPoints: string[];
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FileType = "pdf" | "docx" | "xlsx" | "image";
export type DocKind =
  | "bp"
  | "research"
  | "contract"
  | "financial_model"
  | "news"
  | "other";
export type ParseStatus = "pending" | "processing" | "done" | "failed";

export interface Document {
  id: string;
  userId: string;
  projectId: string | null;
  filename: string;
  fileType: FileType;
  fileUrl: string | null;
  fileSize: number | null;
  docKind: DocKind;
  extractedText: string | null;
  tags: string[];
  parseStatus: ParseStatus;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeEntryType =
  | "industry"
  | "project"
  | "thesis"
  | "prediction"
  | "chunk";

export interface KnowledgeBaseEntry {
  id: string;
  userId: string;
  sourceDocumentId: string | null;
  projectId: string | null;
  entryType: KnowledgeEntryType;
  title: string | null;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// AI 从 BP 提取的结构化财务数据
export interface YearValue {
  year: string;
  value: number;
  unit: string;
}

export interface FinancialData {
  revenue: YearValue[];
  growth_rate: YearValue[];
  gross_margin: YearValue[];
  users: YearValue[];
  valuation: { round: string; value: number; unit: string }[];
  funding_history: {
    round: string;
    amount: number;
    unit: string;
    year: string;
  }[];
  key_metrics: { name: string; value: string; date: string }[];
  summary: string;
}

export interface Report {
  id: string;
  projectId: string;
  userId: string;
  title: string;
  content: string;
  version: number;
  status: "draft" | "finalized";
  createdAt: string;
  updatedAt: string;
}

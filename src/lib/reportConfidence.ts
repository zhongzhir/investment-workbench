// 从报告正文末尾提取 [CONFIDENCE_START]...[CONFIDENCE_END] JSON 块。
// 解析失败时静默忽略：报告仍正常显示，仅置信度面板缺席。

export type ConfidenceLevel = "高" | "中" | "低";

export interface ConfidenceDimension {
  name: string;
  level: ConfidenceLevel;
  note: string;
}

export interface ConfidenceData {
  overall: ConfidenceLevel;
  dimensions: ConfidenceDimension[];
  uncertainty: string;
}

const VALID_LEVELS: ConfidenceLevel[] = ["高", "中", "低"];

function isLevel(v: unknown): v is ConfidenceLevel {
  return typeof v === "string" && (VALID_LEVELS as string[]).includes(v);
}

function normalize(parsed: unknown): ConfidenceData | null {
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  if (!isLevel(obj.overall)) return null;

  const rawDims = Array.isArray(obj.dimensions) ? obj.dimensions : [];
  const dimensions: ConfidenceDimension[] = [];
  for (const d of rawDims) {
    if (!d || typeof d !== "object") continue;
    const dd = d as Record<string, unknown>;
    if (typeof dd.name !== "string" || !isLevel(dd.level)) continue;
    dimensions.push({
      name: dd.name,
      level: dd.level,
      note: typeof dd.note === "string" ? dd.note : "",
    });
  }
  return {
    overall: obj.overall,
    dimensions,
    uncertainty:
      typeof obj.uncertainty === "string" ? obj.uncertainty : "",
  };
}

export function extractConfidence(content: string): {
  confidence: ConfidenceData | null;
  cleanContent: string;
} {
  if (!content) return { confidence: null, cleanContent: content };

  const re = /\[CONFIDENCE_START\]([\s\S]*?)\[CONFIDENCE_END\]/;
  const match = content.match(re);
  // 始终把标记块从正文剥离（避免渲染到正文中）；解析失败仅 confidence=null
  const cleanContent = content.replace(re, "").trim();

  if (!match) return { confidence: null, cleanContent };

  try {
    const parsed = JSON.parse(match[1].trim());
    return { confidence: normalize(parsed), cleanContent };
  } catch {
    return { confidence: null, cleanContent };
  }
}

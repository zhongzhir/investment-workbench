// 投资认知分析：统计与文本格式化（前后端共用）

import { STAGE_LABELS } from "@/lib/stages";
import { outcomeDef } from "@/lib/outcome";

export interface CognitionJudgment {
  project_id: string;
  project_name: string;
  outcome: string | null;
  stage: string;
  bull_case: string | null;
  bear_case: string | null;
  founder_assessment: string | null;
  key_hypothesis: string | null;
  confidence_level: number | null;
  created_at: string;
}

export interface CognitionStats {
  total: number;
  withOutcome: number;
  avgConfidence: number | null;
  topStage: string | null;
}

// 统计判断数据
export function computeStats(rows: CognitionJudgment[]): CognitionStats {
  const total = rows.length;

  const outcomeProjects = new Set(
    rows
      .filter((r) => r.outcome && r.outcome !== "pending")
      .map((r) => r.project_id)
  );

  const confs = rows
    .map((r) => r.confidence_level)
    .filter((c): c is number => c != null);
  const avgConfidence = confs.length
    ? confs.reduce((a, b) => a + b, 0) / confs.length
    : null;

  const stageCount = new Map<string, number>();
  for (const r of rows) {
    stageCount.set(r.stage, (stageCount.get(r.stage) ?? 0) + 1);
  }
  let topStage: string | null = null;
  let max = 0;
  for (const [s, c] of stageCount) {
    if (c > max) {
      max = c;
      topStage = s;
    }
  }

  return { total, withOutcome: outcomeProjects.size, avgConfidence, topStage };
}

// 统计数据 → AI 提示文本
export function formatStats(
  rows: CognitionJudgment[],
  stats: CognitionStats
): string {
  const lines = [
    `总判断数：${stats.total}`,
    `有最终结果的项目数：${stats.withOutcome}`,
    `平均信心评分：${
      stats.avgConfidence != null ? stats.avgConfidence.toFixed(1) : "暂无"
    }`,
    `判断最多的阶段：${
      stats.topStage ? STAGE_LABELS[stats.topStage] ?? stats.topStage : "暂无"
    }`,
  ];

  // 各阶段分布
  const stageCount = new Map<string, number>();
  for (const r of rows) {
    stageCount.set(r.stage, (stageCount.get(r.stage) ?? 0) + 1);
  }
  lines.push(
    `各阶段判断分布：${
      [...stageCount.entries()]
        .map(([s, c]) => `${STAGE_LABELS[s] ?? s} ${c} 条`)
        .join("，") || "无"
    }`
  );

  // outcome 分布
  const outcomeCount = new Map<string, number>();
  const seenProject = new Set<string>();
  for (const r of rows) {
    if (r.outcome && !seenProject.has(r.project_id)) {
      seenProject.add(r.project_id);
      outcomeCount.set(r.outcome, (outcomeCount.get(r.outcome) ?? 0) + 1);
    }
  }
  lines.push(
    `项目结果分布：${
      [...outcomeCount.entries()]
        .map(([o, c]) => `${outcomeDef(o).label} ${c} 个`)
        .join("，") || "尚无标记结果的项目"
    }`
  );

  return lines.join("\n");
}

// 判断记录 → AI 提示文本
export function formatJudgments(rows: CognitionJudgment[]): string {
  if (rows.length === 0) return "（暂无判断记录）";
  return rows
    .map((j) => {
      const date = new Date(j.created_at).toLocaleDateString("zh-CN");
      const head = `项目「${j.project_name}」· ${
        STAGE_LABELS[j.stage] ?? j.stage
      }阶段 · ${date} · 项目结果：${outcomeDef(j.outcome).label}`;
      const parts = [
        j.bull_case && `看好的理由：${j.bull_case}`,
        j.bear_case && `主要顾虑：${j.bear_case}`,
        j.founder_assessment && `对创始人的判断：${j.founder_assessment}`,
        j.key_hypothesis && `关键待验证假设：${j.key_hypothesis}`,
        j.confidence_level && `信心评分：${j.confidence_level}/5`,
      ].filter(Boolean);
      return `【${head}】\n${parts.join("\n") || "（无具体内容）"}`;
    })
    .join("\n\n");
}

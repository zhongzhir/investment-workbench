"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FinancialCharts } from "./FinancialCharts";
import { StageProgress, type Judgment } from "./StageProgress";
import { stashJudgmentPoints } from "@/lib/clientAI";
import type { FinancialData } from "@/lib/types";

interface Props {
  projectId: string;
  projectName: string;
  processStage: string;
  judgments: Judgment[];
  bpText: string;
  docMeta: { filename: string; chars: number }[];
  initialPoints: string[];
  latestReportId: string | null;
  initialFinancialData: FinancialData | null;
}

export function ProjectDetail({
  projectId,
  projectName,
  processStage,
  judgments,
  bpText,
  docMeta,
  initialPoints,
  latestReportId,
  initialFinancialData,
}: Props) {
  const router = useRouter();

  // 判断要点行：沿用已保存的，否则给 3 个空行
  const [points, setPoints] = useState<string[]>(
    initialPoints.length > 0 ? initialPoints : ["", "", ""]
  );
  const [error, setError] = useState("");

  // 财务数据
  const [financials, setFinancials] = useState<FinancialData | null>(
    initialFinancialData
  );
  const [finLoading, setFinLoading] = useState(false);
  const [finError, setFinError] = useState("");

  async function handleExtractFinancials() {
    setError("");
    setFinError("");
    setFinLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/financials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "提取失败");
      }
      const data = await res.json();
      setFinancials(data.financialData);
    } catch (e) {
      setFinError(e instanceof Error ? e.message : "提取失败");
    } finally {
      setFinLoading(false);
    }
  }

  function updatePoint(i: number, v: string) {
    setPoints((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  }
  function addPoint() {
    if (points.length < 10) setPoints((p) => [...p, ""]);
  }
  function removePoint(i: number) {
    if (points.length > 1) setPoints((p) => p.filter((_, idx) => idx !== i));
  }

  function handleGenerate() {
    const filled = points.map((p) => p.trim()).filter(Boolean);
    if (filled.length < 3 || filled.length > 10) {
      setError("请输入 3–10 条判断要点");
      return;
    }
    setError("");
    stashJudgmentPoints(projectId, filled);
    router.push(`/projects/${projectId}/report?generate=1`);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">{projectName}</h1>
          <p className="mt-1 text-xs text-ink-faint">
            填写判断要点并生成分析报告
          </p>
        </div>
        {latestReportId && (
          <Link
            href={`/projects/${projectId}/report`}
            className="rounded-md border border-line px-3 py-1.5 text-sm text-ink-soft hover:bg-surface"
          >
            查看已有报告
          </Link>
        )}
      </div>

      <div className="mt-6">
        <StageProgress
          projectId={projectId}
          initialStage={processStage}
          initialJudgments={judgments}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        {/* 左：BP 文本 */}
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
            BP 提取文本
          </h2>
          <p className="mt-2 text-xs text-ink-faint">
            {docMeta.length > 0
              ? docMeta
                  .map((d) => `${d.filename}（${d.chars.toLocaleString()} 字）`)
                  .join("、")
              : "尚未上传文档"}
          </p>
          <div className="mt-2 h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg border border-line bg-surface p-4 text-xs leading-6 text-ink-soft">
            {bpText || "（无可显示的文本）"}
          </div>
        </section>

        {/* 右：判断要点 + API Key */}
        <section className="space-y-6">
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              判断要点（3–10 条）
            </h2>
            <div className="mt-3 space-y-2">
              {points.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs text-ink-faint">
                    {i + 1}
                  </span>
                  <input
                    value={p}
                    onChange={(e) => updatePoint(i, e.target.value)}
                    placeholder="一条你对该项目的核心判断"
                    className="flex-1 rounded-md border border-line px-3 py-1.5 text-sm outline-none placeholder:text-ink-faint focus:border-accent"
                  />
                  <button
                    onClick={() => removePoint(i)}
                    disabled={points.length <= 1}
                    className="px-1 text-ink-faint hover:text-ink disabled:opacity-30"
                    aria-label="删除"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {points.length < 10 && (
              <button
                onClick={addPoint}
                className="mt-2 text-xs font-medium text-accent hover:underline"
              >
                + 添加一条
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleGenerate}
              className="flex-1 rounded-md bg-accent py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              生成分析报告
            </button>
            <button
              onClick={handleExtractFinancials}
              disabled={finLoading}
              className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:bg-surface disabled:opacity-50"
            >
              {finLoading ? "提取中…" : "提取财务数据"}
            </button>
          </div>
        </section>
      </div>

      {/* 财务数据图表预览 */}
      {(finLoading || finError || financials) && (
        <div className="mt-10 border-t border-line pt-6">
          <h2 className="mb-3 text-sm font-medium text-ink">财务数据</h2>
          {finLoading ? (
            <p className="py-8 text-center text-sm text-ink-faint">
              AI 正在提取财务数据…
            </p>
          ) : finError ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {finError}
            </p>
          ) : financials ? (
            <FinancialCharts data={financials} />
          ) : null}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FLOW_STAGES,
  TERMINAL_STAGES,
  STAGE_LABELS,
  type Stage,
} from "@/lib/stages";
import { OUTCOMES } from "@/lib/outcome";

export interface Judgment {
  id: string;
  stage: string;
  bull_case: string | null;
  bear_case: string | null;
  founder_assessment: string | null;
  key_hypothesis: string | null;
  confidence_level: number | null;
  created_at: string;
}

interface Props {
  projectId: string;
  initialStage: string;
  initialJudgments: Judgment[];
  initialOutcome: string | null;
  initialOutcomeNote: string | null;
}

const EMPTY_FORM = {
  bull_case: "",
  bear_case: "",
  founder_assessment: "",
  key_hypothesis: "",
  confidence_level: 0,
};

export function StageProgress({
  projectId,
  initialStage,
  initialJudgments,
  initialOutcome,
  initialOutcomeNote,
}: Props) {
  const router = useRouter();
  const [stage, setStage] = useState<string>(initialStage);
  const [judgments, setJudgments] = useState<Judgment[]>(initialJudgments);

  const [targetStage, setTargetStage] = useState<Stage | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 投资结果标记
  const [outcome, setOutcome] = useState<string>(initialOutcome || "pending");
  const [outcomeNote, setOutcomeNote] = useState<string>(
    initialOutcomeNote || ""
  );
  const [outcomeSaving, setOutcomeSaving] = useState(false);

  async function saveOutcome() {
    setOutcomeSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/projects/${projectId}/outcome`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, outcome_note: outcomeNote }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "保存失败");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setOutcomeSaving(false);
    }
  }

  const currentFlowIndex = FLOW_STAGES.indexOf(stage as (typeof FLOW_STAGES)[number]);
  const isTerminal = (TERMINAL_STAGES as readonly string[]).includes(stage);

  function openPanel(target: Stage) {
    if (target === stage) return;
    setTargetStage(target);
    setForm({ ...EMPTY_FORM });
    setError("");
  }

  function closePanel() {
    setTargetStage(null);
    setBusy(false);
    setError("");
  }

  async function advanceStage(target: Stage) {
    const res = await fetch(`/api/projects/${projectId}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: target }),
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "阶段更新失败");
    }
  }

  async function saveJudgment(target: Stage): Promise<Judgment> {
    const res = await fetch(`/api/projects/${projectId}/judgments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: target,
        bull_case: form.bull_case,
        bear_case: form.bear_case,
        founder_assessment: form.founder_assessment,
        key_hypothesis: form.key_hypothesis,
        confidence_level:
          form.confidence_level > 0 ? form.confidence_level : undefined,
      }),
    });
    if (!res.ok) {
      throw new Error((await res.json()).error || "判断记录保存失败");
    }
    return (await res.json()).judgment as Judgment;
  }

  async function handleSkip() {
    if (!targetStage) return;
    setBusy(true);
    setError("");
    try {
      await advanceStage(targetStage);
      setStage(targetStage);
      closePanel();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
      setBusy(false);
    }
  }

  async function handleSaveAndAdvance() {
    if (!targetStage) return;
    setBusy(true);
    setError("");
    try {
      const created = await saveJudgment(targetStage);
      await advanceStage(targetStage);
      setJudgments((prev) => [created, ...prev]);
      setStage(targetStage);
      closePanel();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      {/* 阶段进度条 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center">
          {FLOW_STAGES.map((s, i) => {
            const reached = !isTerminal && i <= currentFlowIndex;
            const isCurrent = !isTerminal && i === currentFlowIndex;
            return (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <button
                  onClick={() => openPanel(s)}
                  className="flex flex-col items-center gap-1.5 outline-none"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors ${
                      reached
                        ? "border-accent bg-accent text-white"
                        : "border-line bg-canvas text-ink-faint hover:border-accent"
                    }`}
                  >
                    {reached ? "●" : "○"}
                  </span>
                  <span
                    className={`text-xs ${
                      isCurrent
                        ? "font-semibold text-accent"
                        : "text-ink-soft"
                    }`}
                  >
                    {STAGE_LABELS[s]}
                  </span>
                </button>
                {i < FLOW_STAGES.length - 1 && (
                  <div
                    className={`mx-1 h-px flex-1 ${
                      !isTerminal && i < currentFlowIndex
                        ? "bg-accent"
                        : "bg-line"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 终态按钮 */}
        <div className="flex shrink-0 gap-2 border-l border-line pl-4">
          {TERMINAL_STAGES.map((s) => (
            <button
              key={s}
              onClick={() => openPanel(s)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                stage === s
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink-soft hover:bg-surface"
              }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* 投资结果标记 */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <span className="text-xs font-medium text-ink-soft">投资结果：</span>
        <select
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          disabled={outcomeSaving}
          className="rounded-md border border-line px-2 py-1.5 text-xs outline-none focus:border-accent"
        >
          {OUTCOMES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.icon ? `${o.icon} ` : ""}
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={outcomeNote}
          onChange={(e) => setOutcomeNote(e.target.value)}
          disabled={outcomeSaving}
          placeholder="备注（可选）"
          className="min-w-[160px] flex-1 rounded-md border border-line px-2 py-1.5 text-xs outline-none placeholder:text-ink-faint focus:border-accent"
        />
        <button
          onClick={saveOutcome}
          disabled={outcomeSaving}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {outcomeSaving ? "保存中…" : "保存"}
        </button>
      </div>

      {/* 判断记录历史 */}
      <JudgmentHistory judgments={judgments} />

      {/* 推进面板 */}
      {targetStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg border border-line bg-canvas p-6 shadow-xl">
            <h3 className="text-sm font-semibold text-ink">
              记录你在「{STAGE_LABELS[targetStage]}」阶段的判断（可跳过）
            </h3>

            <div className="mt-4 space-y-3">
              <Field
                label="看好的理由"
                value={form.bull_case}
                onChange={(v) => setForm((f) => ({ ...f, bull_case: v }))}
              />
              <Field
                label="主要顾虑"
                value={form.bear_case}
                onChange={(v) => setForm((f) => ({ ...f, bear_case: v }))}
              />
              <Field
                label="对创始人的判断"
                value={form.founder_assessment}
                onChange={(v) =>
                  setForm((f) => ({ ...f, founder_assessment: v }))
                }
              />
              <Field
                label="关键待验证假设"
                value={form.key_hypothesis}
                onChange={(v) => setForm((f) => ({ ...f, key_hypothesis: v }))}
              />
              <div>
                <label className="text-xs font-medium text-ink-soft">
                  当前信心评分
                </label>
                <div className="mt-1">
                  <StarPicker
                    value={form.confidence_level}
                    onChange={(v) =>
                      setForm((f) => ({ ...f, confidence_level: v }))
                    }
                  />
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleSkip}
                disabled={busy}
                className="rounded-md border border-line px-4 py-2 text-sm text-ink-soft hover:bg-surface disabled:opacity-50"
              >
                跳过
              </button>
              <button
                onClick={handleSaveAndAdvance}
                disabled={busy}
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {busy ? "处理中…" : "保存并推进"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-ink-soft">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="mt-1 w-full resize-none rounded-md border border-line px-3 py-1.5 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n === value ? 0 : n)}
          className={`text-xl leading-none ${
            n <= value ? "text-accent" : "text-line"
          }`}
          aria-label={`${n} 星`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

function JudgmentHistory({ judgments }: { judgments: Judgment[] }) {
  if (judgments.length === 0) {
    return (
      <p className="mt-5 border-t border-line pt-4 text-xs text-ink-faint">
        暂无判断记录。推进阶段时可记录你的思考。
      </p>
    );
  }

  // 按阶段分组，组内时间倒序（judgments 入参已按时间倒序）
  const byStage = new Map<string, Judgment[]>();
  for (const j of judgments) {
    const list = byStage.get(j.stage) ?? [];
    list.push(j);
    byStage.set(j.stage, list);
  }

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        判断记录
      </h3>
      <div className="mt-3 space-y-4">
        {[...byStage.entries()].map(([stage, list]) => (
          <div key={stage}>
            <div className="mb-2 text-xs font-semibold text-accent">
              {STAGE_LABELS[stage] ?? stage}
            </div>
            <div className="space-y-2">
              {list.map((j) => (
                <JudgmentCard key={j.id} judgment={j} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JudgmentCard({ judgment }: { judgment: Judgment }) {
  const rows: [string, string | null][] = [
    ["看好的理由", judgment.bull_case],
    ["主要顾虑", judgment.bear_case],
    ["对创始人的判断", judgment.founder_assessment],
    ["关键待验证假设", judgment.key_hypothesis],
  ];
  return (
    <div className="rounded-md border border-line bg-canvas p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-accent">
          {judgment.confidence_level
            ? "★".repeat(judgment.confidence_level) +
              "☆".repeat(5 - judgment.confidence_level)
            : "未评分"}
        </span>
        <span className="text-xs text-ink-faint">
          {new Date(judgment.created_at).toLocaleString("zh-CN")}
        </span>
      </div>
      <dl className="mt-2 space-y-1">
        {rows
          .filter(([, v]) => v)
          .map(([label, v]) => (
            <div key={label} className="text-xs">
              <dt className="inline font-medium text-ink-soft">{label}：</dt>
              <dd className="inline whitespace-pre-wrap text-ink-soft">{v}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

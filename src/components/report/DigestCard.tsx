"use client";

import { useState } from "react";

interface DigestStructured {
  key_insights: string[];
  open_questions: string[];
  mindset_shift: string | null;
  watch_points: string[];
  summary: string;
}

interface DigestCardProps {
  reportId: string;
  projectId: string;
  projectName: string;
  conversationLength: number;
  onDigested?: () => void;
}

type Phase = "entry" | "loading" | "preview" | "saving" | "done";

const EMPTY: DigestStructured = {
  key_insights: [],
  open_questions: [],
  mindset_shift: null,
  watch_points: [],
  summary: "",
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export function DigestCard({
  reportId,
  projectId,
  projectName,
  conversationLength,
  onDigested,
}: DigestCardProps) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<DigestStructured>(EMPTY);
  const [error, setError] = useState("");
  const [skipReason, setSkipReason] = useState("");

  async function digest() {
    setError("");
    setSkipReason("");
    setPhase("loading");
    try {
      const res = await fetch(`/api/reports/${reportId}/digest`, {
        method: "POST",
        headers: JSON_HEADERS,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "提炼失败");
      }
      if (json.skip) {
        setSkipReason(json.reason || "对话信息量不足，建议继续深入后再提炼");
        setPhase("entry");
        return;
      }
      setData(json.structured_data as DigestStructured);
      setEditing(false);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "提炼失败");
      setPhase("entry");
    }
  }

  async function save() {
    setError("");
    setPhase("saving");
    try {
      const res = await fetch(`/api/reports/${reportId}/digest`, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          structured_data: data,
          project_id: projectId,
          project_name: projectName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "存入失败");
      }
      setPhase("done");
      onDigested?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "存入失败");
      setPhase("preview");
    }
  }

  // 修改数组中的某条
  function updateItem(
    field: "key_insights" | "open_questions" | "watch_points",
    idx: number,
    value: string
  ) {
    setData((d) => {
      const next = [...d[field]];
      next[idx] = value;
      return { ...d, [field]: next };
    });
  }
  function addItem(field: "key_insights" | "open_questions" | "watch_points") {
    setData((d) => ({ ...d, [field]: [...d[field], ""] }));
  }
  function removeItem(
    field: "key_insights" | "open_questions" | "watch_points",
    idx: number
  ) {
    setData((d) => ({
      ...d,
      [field]: d[field].filter((_, i) => i !== idx),
    }));
  }

  const cardClass =
    "mt-8 rounded-xl border border-blue-800/40 bg-[#0D1B3E] p-4 text-white";

  // 状态四：已入库
  if (phase === "done") {
    return (
      <div className={cardClass}>
        <p className="text-sm font-medium">✅ 已存入知识库</p>
        <p className="mt-1 text-xs text-white/70">
          此次对话的认知摘要已沉淀，将在未来的分析中自动参考。
        </p>
      </div>
    );
  }

  // 状态二：加载中
  if (phase === "loading") {
    return (
      <div className={cardClass}>
        <p className="text-sm">AI 正在提炼认知摘要…</p>
      </div>
    );
  }

  // 状态三：预览确认
  if (phase === "preview" || phase === "saving") {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">📝 认知摘要预览</p>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded border border-white/30 px-2 py-0.5 hover:bg-white/10"
            >
              {editing ? "完成编辑" : "编辑"}
            </button>
            <button
              type="button"
              onClick={digest}
              disabled={phase === "saving"}
              className="rounded border border-white/30 px-2 py-0.5 hover:bg-white/10 disabled:opacity-50"
            >
              重新提炼
            </button>
          </div>
        </div>

        <Section title="核心判断">
          <List
            items={data.key_insights}
            editing={editing}
            placeholder="补充一条核心判断"
            onChange={(i, v) => updateItem("key_insights", i, v)}
            onAdd={() => addItem("key_insights")}
            onRemove={(i) => removeItem("key_insights", i)}
          />
        </Section>

        <Section title="遗留疑问">
          <List
            items={data.open_questions}
            editing={editing}
            placeholder="补充一条疑问"
            onChange={(i, v) => updateItem("open_questions", i, v)}
            onAdd={() => addItem("open_questions")}
            onRemove={(i) => removeItem("open_questions", i)}
          />
        </Section>

        <Section title="认知变化">
          {editing ? (
            <textarea
              value={data.mindset_shift ?? ""}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  mindset_shift: e.target.value || null,
                }))
              }
              rows={2}
              className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/50 focus:outline-none"
              placeholder="若无明显变化可留空"
            />
          ) : (
            <p className="text-xs text-white/80">
              {data.mindset_shift ?? "（无明显变化）"}
            </p>
          )}
        </Section>

        <Section title="待核实事项">
          <List
            items={data.watch_points}
            editing={editing}
            placeholder="补充一条待核实事项"
            onChange={(i, v) => updateItem("watch_points", i, v)}
            onAdd={() => addItem("watch_points")}
            onRemove={(i) => removeItem("watch_points", i)}
          />
        </Section>

        <Section title="摘要">
          {editing ? (
            <textarea
              value={data.summary}
              onChange={(e) =>
                setData((d) => ({ ...d, summary: e.target.value }))
              }
              rows={3}
              className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/50 focus:outline-none"
              placeholder="100 字以内核心摘要"
            />
          ) : (
            <p className="text-xs leading-relaxed text-white/90">
              {data.summary}
            </p>
          )}
        </Section>

        {error && (
          <p className="mt-3 rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setPhase("entry");
              setData(EMPTY);
              setEditing(false);
            }}
            disabled={phase === "saving"}
            className="text-xs text-white/60 hover:text-white"
          >
            忽略
          </button>
          <button
            type="button"
            onClick={save}
            disabled={phase === "saving" || !data.summary.trim()}
            className="rounded bg-[#FF6B35] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {phase === "saving" ? "存入中…" : "存入知识库 ✓"}
          </button>
        </div>
      </div>
    );
  }

  // 状态一：入口提示
  return (
    <div className={cardClass}>
      <p className="text-sm font-medium">💡 沉淀此次对话的认知价值</p>
      <p className="mt-1 text-xs text-white/70">
        已进行 {conversationLength} 轮深度对话，
        AI 可帮你提炼关键判断与待核实事项，存入知识库。
      </p>
      {skipReason && (
        <p className="mt-2 rounded bg-white/10 px-2 py-1 text-xs text-white/80">
          {skipReason}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded bg-red-500/20 px-2 py-1 text-xs text-red-200">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={digest}
          className="rounded bg-[#FF6B35] px-4 py-1.5 text-xs font-medium text-white hover:opacity-90"
        >
          提炼并存入知识库
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-white/70">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function List({
  items,
  editing,
  placeholder,
  onChange,
  onAdd,
  onRemove,
}: {
  items: string[];
  editing: boolean;
  placeholder: string;
  onChange: (idx: number, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  if (!editing) {
    if (items.length === 0) {
      return <p className="text-xs text-white/50">（无）</p>;
    }
    return (
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-white/90">
            · {it}
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={it}
            onChange={(e) => onChange(i, e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded bg-white/10 px-2 py-1 text-xs text-white placeholder:text-white/50 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-xs text-white/60 hover:text-white"
            aria-label="删除"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-xs text-white/70 hover:text-white"
      >
        + 添加一条
      </button>
    </div>
  );
}

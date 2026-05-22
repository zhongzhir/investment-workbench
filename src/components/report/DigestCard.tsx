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
  // 两种数据源二选一：
  // - report 模式：传 reportId
  // - conversation 模式：传 conversationId
  reportId?: string;
  conversationId?: string;
  projectId?: string | null;
  projectName: string;
  conversationLength: number;
  onDigested?: () => void;
  // 紧凑模式：用于浮层内嵌，去掉顶部外边距
  compact?: boolean;
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
  conversationId,
  projectId,
  projectName,
  conversationLength,
  onDigested,
  compact = false,
}: DigestCardProps) {
  const [phase, setPhase] = useState<Phase>("entry");
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<DigestStructured>(EMPTY);
  const [error, setError] = useState("");
  const [skipReason, setSkipReason] = useState("");

  // 根据传入的 ID 决定 API 前缀
  const apiBase = conversationId
    ? `/api/conversations/${conversationId}/digest`
    : `/api/reports/${reportId}/digest`;

  // 容错读取响应 JSON：HTML / 空响应 / 流截断都不再抛 "Unexpected end of JSON input"
  async function readJsonSafe(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    if (!text.trim()) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { error: `服务端返回非 JSON（HTTP ${res.status}）` };
    }
  }

  async function digest() {
    setError("");
    setSkipReason("");
    setPhase("loading");
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: JSON_HEADERS,
      });
      const json = await readJsonSafe(res);
      if (!res.ok) {
        console.error("[DigestCard] POST 失败", res.status, json);
        throw new Error(
          (json.error as string) || `提炼失败（HTTP ${res.status}）`
        );
      }
      if (json.skip) {
        setSkipReason(
          (json.reason as string) || "对话信息量不足，建议继续深入后再提炼"
        );
        setPhase("entry");
        return;
      }
      setData(json.structured_data as DigestStructured);
      setEditing(false);
      setPhase("preview");
    } catch (e) {
      console.error("[DigestCard] 提炼异常", e);
      setError(e instanceof Error ? e.message : "提炼失败");
      setPhase("entry");
    }
  }

  async function save() {
    setError("");
    setPhase("saving");
    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({
          structured_data: data,
          project_id: projectId ?? null,
          project_name: projectName,
        }),
      });
      const json = await readJsonSafe(res);
      if (!res.ok || !json.success) {
        console.error("[DigestCard] PUT 失败", res.status, json);
        throw new Error(
          (json.error as string) || `存入失败（HTTP ${res.status}）`
        );
      }
      setPhase("done");
      onDigested?.();
    } catch (e) {
      console.error("[DigestCard] 存入异常", e);
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

  // 柔和的边框卡片风格，替代深蓝+橙色高饱和方案
  const topMargin = compact ? "" : "mt-8";
  const cardClass = `${topMargin} rounded-xl border border-blue-200 bg-blue-50/60 p-4`;

  // 状态四：已入库
  if (phase === "done") {
    return (
      <div
        className={`${topMargin} rounded-xl border border-green-200 bg-green-50/60 p-4`}
      >
        <p className="text-sm font-medium text-green-700">✅ 已存入知识库</p>
        <p className="mt-1 text-xs text-slate-500">
          此次对话的认知摘要已沉淀，将在未来的分析中自动参考。
        </p>
      </div>
    );
  }

  // 状态二：加载中
  if (phase === "loading") {
    return (
      <div className={cardClass}>
        <p className="text-sm text-blue-700">AI 正在提炼认知摘要…</p>
      </div>
    );
  }

  // 状态三：预览确认
  if (phase === "preview" || phase === "saving") {
    return (
      <div className={cardClass}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-blue-700">📝 认知摘要预览</p>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded border border-slate-300 px-2 py-0.5 text-slate-600 hover:bg-slate-100"
            >
              {editing ? "完成编辑" : "编辑"}
            </button>
            <button
              type="button"
              onClick={digest}
              disabled={phase === "saving"}
              className="rounded border border-slate-300 px-2 py-0.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50"
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
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-ink placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              placeholder="若无明显变化可留空"
            />
          ) : (
            <p className="text-xs text-slate-700">
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
              className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-ink placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
              placeholder="100 字以内核心摘要"
            />
          ) : (
            <p className="text-xs leading-relaxed text-slate-700">
              {data.summary}
            </p>
          )}
        </Section>

        {error && (
          <p className="mt-3 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
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
            className="text-xs text-slate-500 hover:text-slate-700"
          >
            忽略
          </button>
          <button
            type="button"
            onClick={save}
            disabled={phase === "saving" || !data.summary.trim()}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
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
      <p className="text-sm font-medium text-blue-700">💡 沉淀此次对话的认知价值</p>
      <p className="mt-1 text-xs text-slate-500">
        已进行 {conversationLength} 轮深度对话，
        AI 可帮你提炼关键判断与待核实事项，存入知识库。
      </p>
      {skipReason && (
        <p className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">
          {skipReason}
        </p>
      )}
      {error && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          {error}
        </p>
      )}
      <div className="mt-3 flex justify-center">
        <button
          type="button"
          onClick={digest}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
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
      <p className="text-xs font-medium text-slate-500">{title}</p>
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
      return <p className="text-xs text-slate-400">（无）</p>;
    }
    return (
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-xs text-slate-700">
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
            className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-ink placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="text-xs text-slate-400 hover:text-slate-600"
            aria-label="删除"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        + 添加一条
      </button>
    </div>
  );
}

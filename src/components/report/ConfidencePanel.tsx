"use client";

import { useState } from "react";
import type {
  ConfidenceData,
  ConfidenceLevel,
} from "@/lib/reportConfidence";

const LEVEL_STYLE: Record<
  ConfidenceLevel,
  { color: string; bg: string; border: string; dot: string }
> = {
  高: {
    color: "text-[#3d7a5e]",
    bg: "bg-[#3d7a5e10]",
    border: "border-[#3d7a5e]",
    dot: "bg-[#3d7a5e]",
  },
  中: {
    color: "text-[#FF6B35]",
    bg: "bg-[#FF6B3510]",
    border: "border-[#FF6B35]",
    dot: "bg-[#FF6B35]",
  },
  低: {
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-400",
    dot: "bg-red-500",
  },
};

function LevelBadge({ level }: { level: ConfidenceLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${s.color} ${s.bg} ${s.border}`}
    >
      {level}
    </span>
  );
}

function LevelDot({ level }: { level: ConfidenceLevel }) {
  const s = LEVEL_STYLE[level];
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`}
      aria-hidden="true"
    />
  );
}

export function ConfidencePanel({ data }: { data: ConfidenceData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm text-slate-700">
          📊 AI 置信度评估
          <span className="text-xs text-slate-400">总体</span>
          <LevelBadge level={data.overall} />
        </span>
        <span className="text-xs text-slate-400">
          {open ? "收起 ∧" : "展开 ∨"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3">
          {data.dimensions.length > 0 ? (
            <ul className="space-y-2">
              {data.dimensions.map((d, i) => {
                const s = LEVEL_STYLE[d.level];
                return (
                  <li key={i} className="flex items-start gap-3 text-xs">
                    <span className="w-16 shrink-0 text-slate-500">
                      {d.name}
                    </span>
                    <span className="mt-1.5 shrink-0">
                      <LevelDot level={d.level} />
                    </span>
                    <span className={`w-8 shrink-0 font-medium ${s.color}`}>
                      {d.level}
                    </span>
                    <span className="flex-1 text-slate-600">
                      {d.note || "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">（无维度数据）</p>
          )}

          {data.uncertainty && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⚠️ 主要不确定性：{data.uncertainty}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

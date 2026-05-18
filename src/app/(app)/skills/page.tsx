"use client";

import { useEffect, useState } from "react";
import { SkillRunner } from "@/components/skills/SkillRunner";
import { CreateSkillModal } from "@/components/skills/CreateSkillModal";
import {
  SKILL_CATEGORIES,
  CATEGORY_ICONS,
  STAGE_LABELS,
} from "@/lib/skills";

interface SkillItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  applicable_stages: string[];
  skillType: "catalog" | "custom";
}

type TabKey = "all" | "analysis" | "due_diligence" | "valuation" | "post_investment" | "mine";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "analysis", label: "分析框架" },
  { key: "due_diligence", label: "尽调工具" },
  { key: "valuation", label: "估值决策" },
  { key: "post_investment", label: "投后管理" },
  { key: "mine", label: "我的 SKILL" },
];

export default function SkillsPage() {
  const [catalog, setCatalog] = useState<SkillItem[]>([]);
  const [custom, setCustom] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("all");
  const [runnerSkill, setRunnerSkill] = useState<SkillItem | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/skills/catalog");
      const data = await res.json();
      setCatalog(
        (data.catalog ?? []).map((s: SkillItem) => ({
          ...s,
          skillType: "catalog" as const,
        }))
      );
      setCustom(
        (data.custom ?? []).map((s: SkillItem) => ({
          ...s,
          skillType: "custom" as const,
        }))
      );
    } catch {
      setCatalog([]);
      setCustom([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function deleteCustom(id: string) {
    if (!confirm("确定删除该自建 SKILL？")) return;
    const res = await fetch(`/api/skills/custom/${id}`, { method: "DELETE" });
    if (res.ok) setCustom((prev) => prev.filter((s) => s.id !== id));
  }

  const visible: SkillItem[] =
    tab === "mine"
      ? custom
      : tab === "all"
        ? catalog
        : catalog.filter((s) => s.category === tab);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">SKILL 市场</h1>
          <p className="mt-1 text-xs text-ink-faint">
            投资分析技能库，一键调用结构化分析框架
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          创建我的 SKILL
        </button>
      </div>

      {/* 分类 Tab */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3.5 py-2 text-sm transition-colors ${
              tab === t.key
                ? "border-accent font-medium text-accent"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* SKILL 卡片网格 */}
      {loading ? (
        <p className="mt-8 text-sm text-ink-faint">加载中…</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <SkillCard
              key={s.id}
              skill={s}
              onRun={() => setRunnerSkill(s)}
              onDelete={
                s.skillType === "custom"
                  ? () => deleteCustom(s.id)
                  : undefined
              }
            />
          ))}

          {/* 我的 SKILL：创建入口 */}
          {tab === "mine" && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex min-h-[150px] items-center justify-center rounded-lg border border-dashed border-line text-sm text-ink-faint hover:border-accent hover:text-accent"
            >
              + 创建新 SKILL
            </button>
          )}
        </div>
      )}

      {!loading && visible.length === 0 && tab !== "mine" && (
        <p className="mt-8 text-sm text-ink-faint">该分类暂无 SKILL。</p>
      )}
      {!loading && visible.length === 0 && tab === "mine" && (
        <p className="mt-4 text-xs text-ink-faint">
          还没有自建 SKILL，点击上方卡片创建第一个。
        </p>
      )}

      {/* 运行面板 */}
      {runnerSkill && (
        <SkillRunner
          skill={runnerSkill}
          onClose={() => setRunnerSkill(null)}
        />
      )}

      {/* 创建面板 */}
      {showCreate && (
        <CreateSkillModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setTab("mine");
            load();
          }}
        />
      )}
    </div>
  );
}

function SkillCard({
  skill,
  onRun,
  onDelete,
}: {
  skill: SkillItem;
  onRun: () => void;
  onDelete?: () => void;
}) {
  const icon = skill.category ? CATEGORY_ICONS[skill.category] ?? "🧩" : "🧩";
  return (
    <div className="flex flex-col rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-2">
        <span className="text-lg">{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-ink">{skill.name}</h3>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="shrink-0 text-xs text-ink-faint hover:text-red-600"
            aria-label="删除"
          >
            ✕
          </button>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-ink-soft">
        {skill.description || "（无描述）"}
      </p>
      {skill.applicable_stages?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skill.applicable_stages.map((st) => (
            <span
              key={st}
              className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent"
            >
              🏷 {STAGE_LABELS[st] ?? st}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          onClick={onRun}
          className="rounded-md border border-accent px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft"
        >
          调用 →
        </button>
      </div>
    </div>
  );
}

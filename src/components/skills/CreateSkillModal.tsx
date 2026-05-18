"use client";

import { useState } from "react";
import { SKILL_CATEGORIES, SKILL_STAGES, STAGE_LABELS } from "@/lib/skills";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSkillModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(SKILL_CATEGORIES[0].value);
  const [stages, setStages] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleStage(s: string) {
    setStages((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  async function save() {
    if (!name.trim()) {
      setError("请填写 SKILL 名称");
      return;
    }
    if (!template.trim()) {
      setError("请填写 Prompt 模板");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/skills/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          category,
          prompt_template: template,
          applicable_stages: stages,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "保存失败");
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-line bg-canvas p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">创建我的 SKILL</h2>
          <button
            onClick={onClose}
            className="text-sm text-ink-faint hover:text-ink"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-ink-soft">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-soft">描述</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-ink-soft">分类</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            >
              {SKILL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-soft">
              适用阶段（可多选）
            </label>
            <div className="mt-1.5 flex flex-wrap gap-3">
              {SKILL_STAGES.map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-1.5 text-sm text-ink-soft"
                >
                  <input
                    type="checkbox"
                    checked={stages.includes(s)}
                    onChange={() => toggleStage(s)}
                  />
                  {STAGE_LABELS[s]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-ink-soft">
              Prompt 模板 <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 rounded-md bg-surface px-3 py-2 text-xs text-ink-faint">
              可使用以下变量（运行时自动注入关联项目数据）：
              <br />
              <code>{"{project_info}"}</code> <code>{"{bp_content}"}</code>{" "}
              <code>{"{financial_data}"}</code> <code>{"{judgments}"}</code>
            </p>
            <textarea
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={8}
              placeholder="请对以下项目进行分析…\n\n项目信息：\n{project_info}\n\nBP内容：\n{bp_content}"
              className="mt-1.5 w-full resize-y rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-md border border-line px-4 py-2 text-sm text-ink-soft hover:bg-surface disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存 SKILL"}
          </button>
        </div>
      </div>
    </div>
  );
}

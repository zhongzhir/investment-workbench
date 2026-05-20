"use client";

import { useState } from "react";

export interface ConversationListItem {
  id: string;
  title: string | null;
  project_id: string | null;
  project_name: string | null;
  updated_at: string;
}

interface Props {
  items: ConversationListItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => Promise<void> | void;
  creating?: boolean;
}

type Group = "today" | "yesterday" | "earlier";
const GROUP_LABEL: Record<Group, string> = {
  today: "今天",
  yesterday: "昨天",
  earlier: "更早",
};

function bucket(ts: string): Group {
  const d = new Date(ts);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  if (d >= startOfToday) return "today";
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (d >= startOfYesterday) return "yesterday";
  return "earlier";
}

export function ConversationList({
  items,
  activeId,
  onSelect,
  onNew,
  onDelete,
  creating,
}: Props) {
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const grouped: Record<Group, ConversationListItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };
  for (const it of items) grouped[bucket(it.updated_at)].push(it);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-surface">
      <div className="border-b border-slate-200 p-3">
        <button
          type="button"
          onClick={onNew}
          disabled={creating}
          className="w-full rounded-lg bg-[#1B6FE8] px-3 py-2 text-sm font-medium tracking-[0.01em] text-white transition-colors duration-150 hover:bg-[#1762d0] disabled:opacity-50"
        >
          {creating ? "创建中…" : "+ 新对话"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {items.length === 0 ? (
          <p className="px-2 text-xs text-slate-400">还没有对话</p>
        ) : (
          (["today", "yesterday", "earlier"] as Group[]).map((g) => {
            const list = grouped[g];
            if (list.length === 0) return null;
            return (
              <div key={g} className="mb-4">
                <p className="px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {GROUP_LABEL[g]}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {list.map((it) => {
                    const active = it.id === activeId;
                    return (
                      <li
                        key={it.id}
                        className={`group relative rounded-lg ${
                          active ? "bg-blue-50" : "hover:bg-slate-100"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelect(it.id)}
                          className="block w-full px-2.5 py-1.5 text-left"
                        >
                          <div
                            className={`truncate text-sm ${
                              active
                                ? "font-medium text-blue-700"
                                : "text-ink-soft"
                            }`}
                          >
                            {it.title || "新对话"}
                          </div>
                          {it.project_name && (
                            <div className="mt-0.5 truncate text-xs text-slate-400">
                              · {it.project_name}
                            </div>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (pendingDelete === it.id) {
                              setPendingDelete(null);
                              await onDelete(it.id);
                            } else {
                              setPendingDelete(it.id);
                              window.setTimeout(
                                () =>
                                  setPendingDelete((cur) =>
                                    cur === it.id ? null : cur
                                  ),
                                3000
                              );
                            }
                          }}
                          aria-label="删除对话"
                          className={`absolute right-1.5 top-1.5 rounded px-1.5 py-0.5 text-xs ${
                            pendingDelete === it.id
                              ? "bg-red-500 text-white"
                              : "text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-ink"
                          }`}
                        >
                          {pendingDelete === it.id ? "确认删除" : "×"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}

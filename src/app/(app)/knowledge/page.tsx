"use client";

import { useState, useEffect, useRef } from "react";

interface KBEntry {
  id: string;
  content: string;
  source_type: string;
  tags: string[];
  embedding_model: string | null;
  created_at: string;
}

interface Source {
  content: string;
  source_type: string;
  score: number;
}

const SOURCE_LABEL: Record<string, string> = {
  manual: "手动录入",
  document: "项目文档",
  report: "分析报告",
};

export default function KnowledgePage() {
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // 录入
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);

  // 搜索
  const [question, setQuestion] = useState("");
  const [searching, setSearching] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const answerRef = useRef("");

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    setLoading(true);
    const res = await fetch("/api/knowledge");
    const data = await res.json();
    setEntries(data.entries ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newContent.trim()) return;
    setSaving(true);
    const res = await fetch("/api/knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent }),
    });
    if (res.ok) {
      setNewContent("");
      fetchEntries();
    }
    setSaving(false);
  }

  async function handleSearch() {
    if (!question.trim()) return;
    setSearching(true);
    setAnswer("");
    setSources([]);
    answerRef.current = "";

    const res = await fetch("/api/knowledge/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    if (!res.ok) {
      setSearching(false);
      return;
    }

    const contentType = res.headers.get("Content-Type") ?? "";

    if (contentType.includes("text/event-stream")) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") break;
          try {
            const msg = JSON.parse(raw);
            if (msg.type === "sources") setSources(msg.sources);
            if (msg.type === "text") {
              answerRef.current += msg.text;
              setAnswer(answerRef.current);
            }
          } catch {}
        }
      }
    } else {
      const data = await res.json();
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
    }

    setSearching(false);
  }

  return (
    <div className="mx-auto max-w-doc px-6 py-12">
      {/* 页头 */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-ink">知识库</h1>
        <p className="mt-1 text-sm text-ink-soft">
          你的私有知识沉淀。
          {total > 0 ? `已收录 ${total} 条内容。` : "从录入第一条开始。"}
        </p>
      </div>

      {/* 搜索问答区 */}
      <div className="mb-10 rounded-lg border border-line bg-white p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
          知识检索
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="问任何问题，从你的知识库中检索..."
            className="flex-1 rounded border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-[#0D1B3E]"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !question.trim()}
            className="rounded border border-[#FF6B35] px-4 py-2 text-sm text-[#FF6B35] hover:bg-orange-50 disabled:opacity-40"
          >
            {searching ? "检索中…" : "检索"}
          </button>
        </div>

        {/* 检索结果 */}
        {(answer || sources.length > 0) && (
          <div className="mt-4 space-y-3">
            {answer && (
              <div className="rounded bg-[#F4F6FA] p-4 text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {answer}
              </div>
            )}
            {sources.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-ink-faint">参考来源</p>
                {sources.map((s, i) => (
                  <div
                    key={i}
                    className="rounded border border-line p-3 text-xs text-ink-soft"
                  >
                    <span className="mr-2 rounded bg-[#E8ECF4] px-1.5 py-0.5 text-ink-faint">
                      {SOURCE_LABEL[s.source_type] ?? s.source_type}
                    </span>
                    {s.content.slice(0, 120)}…
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 录入区 */}
      <div className="mb-8 rounded-lg border border-line bg-white p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
          录入新内容
        </p>
        <textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="粘贴研究笔记、投资逻辑、行业洞察…"
          rows={4}
          className="w-full resize-none rounded border border-line px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-[#0D1B3E]"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleAdd}
            disabled={saving || !newContent.trim()}
            className="rounded border border-[#0D1B3E] px-4 py-1.5 text-sm text-[#0D1B3E] transition-colors hover:bg-[#0D1B3E] hover:text-white disabled:opacity-40"
          >
            {saving ? "保存中…" : "保存到知识库"}
          </button>
        </div>
      </div>

      {/* 条目列表 */}
      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
          已收录内容
        </p>
        {loading ? (
          <p className="text-sm text-ink-faint">加载中…</p>
        ) : entries.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line py-12 text-center">
            <p className="text-sm text-ink-soft">知识库为空</p>
            <p className="mt-1 text-xs text-ink-faint">
              上传项目文档或在上方录入笔记，内容将自动收录。
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-line bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="line-clamp-3 text-sm leading-relaxed text-ink">
                    {entry.content}
                  </p>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded bg-[#E8ECF4] px-1.5 py-0.5 text-xs text-ink-faint">
                      {SOURCE_LABEL[entry.source_type] ?? entry.source_type}
                    </span>
                    {entry.embedding_model && (
                      <span className="text-xs text-ink-faint" title="已向量化">
                        ⚡
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  {new Date(entry.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

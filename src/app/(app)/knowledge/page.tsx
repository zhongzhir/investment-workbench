"use client";

import { useState, useEffect, useRef } from "react";
import { FileUploader } from "@/components/shared/FileUploader";
import {
  KNOWLEDGE_CATEGORIES,
  categoryLabel,
} from "@/lib/knowledgeCategories";

interface DigestStructured {
  key_insights?: string[];
  open_questions?: string[];
  mindset_shift?: string | null;
  watch_points?: string[];
  summary?: string;
}

interface KBEntry {
  id: string;
  content: string;
  source_type: string;
  entry_type?: string | null;
  structured_data?: DigestStructured | null;
  tags: string[];
  embedding_model: string | null;
  metadata?: {
    fileName?: string;
    fileType?: string;
    project_name?: string;
    digested_at?: string;
  } | null;
  created_at: string;
}

const FILE_TYPE_LABEL: Record<string, string> = {
  pdf: "PDF",
  docx: "Word",
  pptx: "PPT",
  xlsx: "Excel",
  xls: "Excel",
};

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

  // 文件上传分类
  const [category, setCategory] = useState<string>(
    KNOWLEDGE_CATEGORIES[0].value
  );

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

      {/* 文件上传区 */}
      <div className="mb-8 rounded-lg border border-line bg-white p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-faint">
          上传文件
        </p>
        <div className="mb-3">
          <label className="mb-1 block text-xs text-ink-soft">分类</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded border border-line px-3 py-1.5 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-[#0D1B3E]"
          >
            {KNOWLEDGE_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <FileUploader
          target="knowledge"
          category={category}
          onUploadComplete={(results) => {
            if (results.some((r) => r.status === "done")) fetchEntries();
          }}
        />
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
              <KBEntryItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KBEntryItem({ entry }: { entry: KBEntry }) {
  const [open, setOpen] = useState(false);
  const isDigest = entry.entry_type === "conversation_digest";
  const sd = entry.structured_data;
  const icon = isDigest ? "💬" : "📄";

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-2">
          <span className="text-base leading-5">{icon}</span>
          <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-ink">
            {entry.content}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {isDigest ? (
            <span className="rounded bg-[#0D1B3E] px-1.5 py-0.5 text-xs text-white">
              对话提炼
            </span>
          ) : (
            <span className="rounded bg-[#E8ECF4] px-1.5 py-0.5 text-xs text-ink-faint">
              {entry.metadata?.fileType
                ? `文件上传 · ${
                    FILE_TYPE_LABEL[entry.metadata.fileType] ??
                    entry.metadata.fileType
                  }`
                : entry.source_type === "manual"
                  ? "手动录入"
                  : SOURCE_LABEL[entry.source_type] ?? entry.source_type}
            </span>
          )}
          {entry.tags?.length > 0 && (
            <span className="rounded bg-[#E8ECF4] px-1.5 py-0.5 text-xs text-ink-faint">
              {isDigest ? entry.tags[entry.tags.length - 1] : categoryLabel(entry.tags[0])}
            </span>
          )}
          {entry.embedding_model && (
            <span className="text-xs text-ink-faint" title="已向量化">
              ⚡
            </span>
          )}
        </div>
      </div>

      {isDigest && sd && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-2 text-xs text-[#0D1B3E] hover:underline"
        >
          {open ? "收起" : "展开详情"}
        </button>
      )}

      {isDigest && sd && open && (
        <div className="mt-3 space-y-3 border-t border-line pt-3 text-xs text-ink-soft">
          {sd.key_insights && sd.key_insights.length > 0 && (
            <DigestBlock title="核心判断" items={sd.key_insights} />
          )}
          {sd.open_questions && sd.open_questions.length > 0 && (
            <DigestBlock title="遗留疑问" items={sd.open_questions} />
          )}
          {sd.mindset_shift && (
            <div>
              <p className="font-medium text-ink-faint">认知变化</p>
              <p className="mt-1">{sd.mindset_shift}</p>
            </div>
          )}
          {sd.watch_points && sd.watch_points.length > 0 && (
            <DigestBlock title="待核实事项" items={sd.watch_points} />
          )}
        </div>
      )}

      <p className="mt-2 text-xs text-ink-faint">
        {new Date(entry.created_at).toLocaleDateString("zh-CN")}
        {isDigest && entry.metadata?.project_name && (
          <span className="ml-2">· 来自项目「{entry.metadata.project_name}」</span>
        )}
      </p>
    </div>
  );
}

function DigestBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-medium text-ink-faint">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((it, i) => (
          <li key={i}>· {it}</li>
        ))}
      </ul>
    </div>
  );
}

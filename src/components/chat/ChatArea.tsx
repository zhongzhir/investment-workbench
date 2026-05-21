"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { DigestCard } from "@/components/report/DigestCard";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  ts: string;
  sources?: Array<{ content: string; source_type: string | null }>;
}

export interface ChatConversation {
  id: string;
  title: string | null;
  project_id: string | null;
  project_name: string | null;
  messages: ChatMsg[];
}

interface Props {
  conversation: ChatConversation;
  onTitleUpdate: (id: string, title: string) => void;
  onMessagesChange: (id: string, messages: ChatMsg[]) => void;
}

const QUICK_STARTS = [
  "帮我复盘最近看的几个项目，找出判断规律",
  "我对某赛道还不够了解，帮我建立认知框架",
  "我在纠结一个项目，想从不同角度讨论一下",
  "帮我总结一下我的投资风格和偏好",
];

const MAX_LEN = 2000;

export function ChatArea({
  conversation,
  onTitleUpdate,
  onMessagesChange,
}: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(
    conversation.messages ?? []
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingSources, setStreamingSources] = useState<ChatMsg["sources"]>(
    []
  );
  const [error, setError] = useState("");
  // 偏好捕获条：(messageIndex, pref)，messageIndex 指向 messages 数组中的 AI 消息
  const [pendingPref, setPendingPref] = useState<{
    pref: string;
    messageIndex: number;
  } | null>(null);
  const [prefSaved, setPrefSaved] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // 切换对话时同步外部 messages
  useEffect(() => {
    setMessages(conversation.messages ?? []);
    setStreamingText("");
    setStreamingSources([]);
    setError("");
    setStreaming(false);
  }, [conversation.id, conversation.messages]);

  // 自动滚动到底部
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, streamingText]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setError("");
    setInput("");

    const now = new Date().toISOString();
    const userMsg: ChatMsg = { role: "user", content: message, ts: now };
    const optimisticMessages = [...messages, userMsg];
    setMessages(optimisticMessages);
    setStreaming(true);
    setStreamingText("");
    setStreamingSources([]);

    const controller = new AbortController();
    abortRef.current = controller;

    let fullReply = "";
    let sources: ChatMsg["sources"] = [];
    let savePref: string | null = null;
    try {
      const res = await fetch(
        `/api/conversations/${conversation.id}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        }
      );
      if (!res.ok || !res.body) {
        const errJson = await res
          .json()
          .catch(() => ({ error: "发送失败" }));
        throw new Error(errJson.error || "发送失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6);
          if (raw === "[DONE]") continue;
          try {
            const msg = JSON.parse(raw);
            if (msg.type === "sources") {
              sources = msg.sources ?? [];
              setStreamingSources(sources);
            } else if (msg.type === "text") {
              fullReply += msg.text;
              setStreamingText(fullReply);
            } else if (msg.type === "title") {
              onTitleUpdate(conversation.id, msg.title);
            } else if (msg.type === "save_pref") {
              savePref = typeof msg.pref === "string" ? msg.pref : null;
            } else if (msg.type === "auto_digest") {
              // 自动沉淀已落库；当前不做强提示，保留埋点位置
            } else if (msg.type === "error") {
              throw new Error(msg.error);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message) {
              throw parseErr;
            }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        // 用户主动停止
      } else {
        setError(e instanceof Error ? e.message : "发送失败");
      }
    } finally {
      abortRef.current = null;
    }

    // 兜底：即使后端没发 save_pref SSE 事件，也能从 fullReply 里抠出来
    if (!savePref) {
      const m = fullReply.match(/\[SAVE_PREF:\s*(.+?)\]/);
      if (m) savePref = m[1].trim();
    }
    const cleanedReply = fullReply
      .replace(/\n?\[SAVE_PREF:\s*.+?\]\s*$/, "")
      .trim();

    const assistantMsg: ChatMsg = {
      role: "assistant",
      content: cleanedReply,
      ts: new Date().toISOString(),
      sources,
    };
    const finalMessages = [...optimisticMessages, assistantMsg];
    setMessages(finalMessages);
    setStreaming(false);
    setStreamingText("");
    setStreamingSources([]);
    if (savePref) {
      setPendingPref({ pref: savePref, messageIndex: finalMessages.length - 1 });
      setPrefSaved(false);
    }
    onMessagesChange(conversation.id, finalMessages);
  }

  async function confirmPref() {
    if (!pendingPref) return;
    try {
      const res = await fetch("/api/user/profile/append-pref", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pref: pendingPref.pref }),
      });
      if (res.ok) {
        setPrefSaved(true);
        window.setTimeout(() => setPendingPref(null), 2000);
      }
    } catch {
      // 失败时保留条，让用户再次尝试
    }
  }

  function dismissPref() {
    setPendingPref(null);
    setPrefSaved(false);
  }

  function stop() {
    abortRef.current?.abort();
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  const overLimit = input.length > MAX_LEN;
  const turnCount = messages.length;

  return (
    <div className="flex h-full flex-1 flex-col bg-canvas">
      {/* 顶部 */}
      <div className="border-b border-slate-200 px-6 py-4">
        <h1 className="truncate text-base font-semibold text-ink">
          {conversation.title || "新对话"}
        </h1>
        {conversation.project_name && (
          <p className="mt-0.5 text-xs text-slate-400">
            关联项目：{conversation.project_name}
          </p>
        )}
      </div>

      {/* 消息区 */}
      <div
        ref={scrollerRef}
        className="flex-1 overflow-y-auto px-6 py-6"
      >
        {messages.length === 0 && !streaming ? (
          <div className="mx-auto max-w-2xl pt-8">
            <p className="text-sm text-slate-500">
              不知道从哪开始？试试这些问题：
            </p>
            <div className="mt-4 grid gap-2">
              {QUICK_STARTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-ink-soft transition-colors duration-150 hover:border-blue-400 hover:bg-blue-50/40 hover:text-ink"
                >
                  · {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-5">
            {messages.map((m, i) => (
              <div key={i}>
                <MessageBubble message={m} />
                {pendingPref &&
                  pendingPref.messageIndex === i &&
                  m.role === "assistant" && (
                    <PrefConfirmBar
                      pref={pendingPref.pref}
                      saved={prefSaved}
                      onConfirm={confirmPref}
                      onDismiss={dismissPref}
                    />
                  )}
              </div>
            ))}
            {streaming && (
              <MessageBubble
                message={{
                  role: "assistant",
                  content: streamingText,
                  ts: new Date().toISOString(),
                  sources: streamingSources,
                }}
                streaming
              />
            )}
          </div>
        )}
      </div>

      {/* DigestCard：≥3 轮且非流式时显示 */}
      {turnCount >= 3 && !streaming && (
        <div className="mx-auto w-full max-w-3xl px-6">
          <DigestCard
            conversationId={conversation.id}
            projectId={conversation.project_id}
            projectName={conversation.project_name ?? conversation.title ?? "独立对话"}
            conversationLength={turnCount}
          />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mx-auto w-full max-w-3xl px-6">
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      )}

      {/* 输入区 */}
      <div className="border-t border-slate-200 bg-canvas px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={streaming}
            rows={3}
            placeholder="想聊点什么？Enter 发送，Shift+Enter 换行"
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
          />
          <div className="mt-2 flex items-center justify-between">
            <span
              className={`text-xs ${
                overLimit ? "text-red-500" : "text-slate-400"
              }`}
            >
              {input.length} / {MAX_LEN}
            </span>
            {streaming ? (
              <button
                type="button"
                onClick={stop}
                className="rounded-lg border border-red-300 px-4 py-1.5 text-sm font-medium text-red-600 transition-colors duration-150 hover:bg-red-50"
              >
                停止
              </button>
            ) : (
              <button
                type="button"
                onClick={() => send(input)}
                disabled={!input.trim() || overLimit}
                className="rounded-lg bg-[#1B6FE8] px-4 py-1.5 text-sm font-medium tracking-[0.01em] text-white transition-colors duration-150 hover:bg-[#1762d0] disabled:opacity-50"
              >
                发送
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
}: {
  message: ChatMsg;
  streaming?: boolean;
}) {
  const [showSources, setShowSources] = useState(false);
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] ${isUser ? "" : "w-full"}`}>
        <div
          title={new Date(message.ts).toLocaleString("zh-CN")}
          className={
            isUser
              ? "inline-block rounded-2xl rounded-tr-md bg-[#0D1B3E] px-4 py-2.5 text-sm text-white"
              : "report-body rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm"
          }
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {message.content ? (
                <ReactMarkdown>{message.content}</ReactMarkdown>
              ) : (
                <span className="text-slate-400">…</span>
              )}
              {streaming && <span className="type-cursor" />}
            </>
          )}
        </div>
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-1.5 text-xs text-slate-400">
            <button
              type="button"
              onClick={() => setShowSources((v) => !v)}
              className="hover:text-ink-soft"
            >
              📚 参考了知识库 {message.sources.length} 条内容
              {showSources ? " ▴" : " ▾"}
            </button>
            {showSources && (
              <ul className="mt-1.5 space-y-1">
                {message.sources.map((s, i) => (
                  <li
                    key={i}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-slate-500"
                  >
                    {s.content.slice(0, 120)}
                    {s.content.length > 120 ? "…" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PrefConfirmBar({
  pref,
  saved,
  onConfirm,
  onDismiss,
}: {
  pref: string;
  saved: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  if (saved) {
    return (
      <div className="mt-2 rounded-lg border-l-2 border-blue-500 bg-[#1B6FE808] px-3 py-2 text-xs text-blue-700 transition-opacity duration-500">
        ✅ 已加入你的投资人画像
      </div>
    );
  }
  return (
    <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border-l-2 border-blue-500 bg-[#1B6FE808] px-3 py-2 text-xs">
      <p className="flex-1 text-ink-soft">
        💡 发现新偏好：「<span className="text-ink">{pref}</span>」
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded border border-blue-500 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
        >
          加入画像
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-50"
        >
          忽略
        </button>
      </div>
    </div>
  );
}

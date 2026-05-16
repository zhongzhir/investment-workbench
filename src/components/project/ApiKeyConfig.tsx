"use client";

import { useEffect, useState } from "react";

const PROVIDERS = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "openai", label: "OpenAI" },
  { value: "qwen", label: "通义千问" },
  { value: "claude", label: "Claude" },
];

// API Key 配置区。Key 经 AES-256-GCM 加密后存储于数据库，前端仅见脱敏值。
export function ApiKeyConfig({
  onChange,
}: {
  onChange?: (configured: boolean) => void;
}) {
  const [provider, setProvider] = useState("deepseek");
  const [newKey, setNewKey] = useState("");
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const res = await fetch("/api/user/api-key");
    if (!res.ok) return;
    const data = await res.json();
    setProvider(data.provider || "deepseek");
    setMaskedKey(data.maskedKey);
    setConfigured(!!data.configured);
    onChange?.(!!data.configured);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave() {
    setError("");
    setMessage("");
    if (!configured && !newKey.trim()) {
      setError("请输入 API Key");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/api-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: newKey.trim() || undefined,
          provider,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json()).error || "保存失败");
      }
      setNewKey("");
      await refresh();
      setMessage("已保存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="text-sm font-medium text-ink">AI 模型与 API Key</div>
      <p className="mt-1 text-xs text-ink-faint">
        Key 经 AES-256-GCM 加密后存储，页面仅显示脱敏值。
      </p>

      <div className="mt-3 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-ink-soft">服务商</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            disabled={loading || saving}
            className="w-full rounded-md border border-line bg-canvas px-2.5 py-1.5 text-sm outline-none focus:border-accent"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-soft">API Key</label>
          {configured && (
            <p className="mb-1 text-xs text-ink-faint">
              当前已保存：
              <span className="font-mono text-ink-soft">{maskedKey}</span>
            </p>
          )}
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            disabled={loading || saving}
            placeholder={configured ? "输入新 Key 可替换" : "sk-..."}
            className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
        {message && <p className="text-xs text-accent">{message}</p>}

        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>
    </div>
  );
}

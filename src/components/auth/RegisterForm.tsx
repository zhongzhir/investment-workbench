"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthBrand } from "./AuthBrand";

const INPUT =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent";

type Tab = "email" | "phone";

export function RegisterForm() {
  const [tab, setTab] = useState<Tab>("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // 公共
  const [name, setName] = useState("");

  // 邮箱注册
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // 手机注册
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function switchTab(next: Tab) {
    setTab(next);
    setError("");
  }

  async function register(payload: Record<string, string>) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "注册失败，请重试");
        setLoading(false);
        return;
      }
      setDone(true);
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
  }

  async function handleEmailRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError("密码至少 8 位，且需包含字母和数字");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }
    await register({ name, email, password });
  }

  async function sendCode() {
    setError("");
    if (!/^1\d{10}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, purpose: "register" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "验证码发送失败");
      } else {
        setCountdown(60);
      }
    } catch {
      setError("网络错误，请重试");
    }
    setSending(false);
  }

  async function handlePhoneRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await register({ name, phone, code });
  }

  if (done) {
    return (
      <div>
        <AuthBrand subtitle="注册成功" />
        <p className="text-sm leading-6 text-ink-soft">
          账号已创建成功，请使用刚才的账号登录。
        </p>
        <Link
          href="/login"
          className="mt-5 block w-full rounded-md bg-accent py-2 text-center text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          去登录
        </Link>
      </div>
    );
  }

  return (
    <div>
      <AuthBrand subtitle="创建你的投资工作台账号" />

      <div className="mb-5 flex rounded-md border border-line p-0.5 text-sm">
        <button
          type="button"
          onClick={() => switchTab("email")}
          className={`flex-1 rounded py-1.5 transition-colors ${
            tab === "email"
              ? "bg-accent text-white"
              : "text-ink-soft hover:bg-surface"
          }`}
        >
          邮箱注册
        </button>
        <button
          type="button"
          onClick={() => switchTab("phone")}
          className={`flex-1 rounded py-1.5 transition-colors ${
            tab === "phone"
              ? "bg-accent text-white"
              : "text-ink-soft hover:bg-surface"
          }`}
        >
          手机注册
        </button>
      </div>

      {tab === "email" ? (
        <form onSubmit={handleEmailRegister} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="至少 8 位，含字母和数字"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">确认密码</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className={INPUT}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "注册中…" : "注册"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePhoneRegister} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
              placeholder="11 位手机号"
              className={INPUT}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-ink-soft">验证码</label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
                placeholder="6 位验证码"
                className={INPUT}
              />
              <button
                type="button"
                onClick={sendCode}
                disabled={sending || countdown > 0}
                className="shrink-0 whitespace-nowrap rounded-md border border-line px-3 text-sm text-ink-soft transition-colors hover:bg-surface disabled:opacity-50"
              >
                {countdown > 0 ? `${countdown}s` : sending ? "发送中…" : "获取验证码"}
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "注册中…" : "注册"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-ink-faint">
        已有账号？{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          登录
        </Link>
      </p>
    </div>
  );
}

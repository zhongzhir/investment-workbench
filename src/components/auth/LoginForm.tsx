"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthBrand } from "./AuthBrand";

const INPUT =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent";

type Tab = "email" | "phone";

export function LoginForm({ githubEnabled }: { githubEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/";

  const [tab, setTab] = useState<Tab>("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 邮箱登录
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 手机登录
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

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "CredentialsSignin" ? "邮箱或密码不正确" : res.error
      );
      return;
    }
    router.push(callbackUrl);
    router.refresh();
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
        body: JSON.stringify({ phone, purpose: "login" }),
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

  async function handlePhoneLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await signIn("phone", { phone, code, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(
        res.error === "CredentialsSignin"
          ? "手机号或验证码不正确"
          : res.error
      );
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div>
      <AuthBrand subtitle="登录你的投资工作台" />

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
          邮箱登录
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
          手机登录
        </button>
      </div>

      {tab === "email" ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-ink-soft">密码</label>
              <Link
                href="/forgot-password"
                className="text-xs text-ink-faint hover:text-accent hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={INPUT}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePhoneLogin} className="space-y-4">
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
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      )}

      {githubEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
            <span className="h-px flex-1 bg-line" />
            或
            <span className="h-px flex-1 bg-line" />
          </div>
          <button
            onClick={() => signIn("github", { callbackUrl })}
            className="w-full rounded-md border border-line bg-canvas py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            使用 GitHub 登录
          </button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink-faint">
        还没有账号？{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          注册
        </Link>
      </p>

      <p className="mt-4 text-center text-xs text-ink-faint">
        使用即表示同意{" "}
        <Link href="/legal/terms" className="hover:underline">
          用户协议
        </Link>{" "}
        ·{" "}
        <Link href="/legal/disclaimer" className="hover:underline">
          免责声明
        </Link>
      </p>
    </div>
  );
}

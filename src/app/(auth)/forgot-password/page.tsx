"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthBrand } from "@/components/auth/AuthBrand";

const INPUT =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "提交失败，请重试");
      } else {
        setDone(true);
      }
    } catch {
      setError("网络错误，请重试");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div>
        <AuthBrand subtitle="找回密码" />
        <p className="text-sm leading-6 text-ink-soft">
          如果该邮箱已注册，你将收到一封密码重置邮件，请查收并按邮件指引设置新密码。
        </p>
        <p className="mt-6 text-center text-sm text-ink-faint">
          <Link href="/login" className="font-medium text-accent hover:underline">
            返回登录
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <AuthBrand subtitle="找回密码" />
      <p className="mb-4 text-sm leading-6 text-ink-faint">
        输入注册邮箱，我们将向你发送密码重置链接。
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-accent py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "发送中…" : "发送重置邮件"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-faint">
        想起密码了？{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          返回登录
        </Link>
      </p>
    </div>
  );
}

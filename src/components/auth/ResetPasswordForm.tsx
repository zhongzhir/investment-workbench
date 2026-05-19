"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthBrand } from "./AuthBrand";

const INPUT =
  "w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-accent";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("密码至少 8 位");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "重置失败，请重试");
        setLoading(false);
        return;
      }
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div>
        <AuthBrand subtitle="重置密码" />
        <p className="text-sm text-red-600">
          重置链接无效，请重新发起密码重置。
        </p>
        <p className="mt-6 text-center text-sm text-ink-faint">
          <Link
            href="/forgot-password"
            className="font-medium text-accent hover:underline"
          >
            去找回密码
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <AuthBrand subtitle="重置密码" />
        <p className="text-sm leading-6 text-ink-soft">
          密码已重置成功，正在跳转到登录页…
        </p>
      </div>
    );
  }

  return (
    <div>
      <AuthBrand subtitle="设置新密码" />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm text-ink-soft">新密码</label>
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
          <label className="mb-1.5 block text-sm text-ink-soft">确认新密码</label>
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
          {loading ? "提交中…" : "重置密码"}
        </button>
      </form>
    </div>
  );
}

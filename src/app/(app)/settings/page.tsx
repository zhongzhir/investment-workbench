import Link from "next/link";
import { ApiKeyConfig } from "@/components/project/ApiKeyConfig";
import { ApiKeyGuide } from "@/components/project/ApiKeyGuide";
import { ProfileForm } from "@/components/settings/ProfileForm";

// 设置页：AI 模型与 API Key 管理 + 投资人画像。
export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-doc px-6 py-12">
      <h1 className="text-xl font-semibold text-ink">设置</h1>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-ink">AI 模型与 API Key</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          配置用于生成投资分析报告的 AI 服务商与 API Key。
          Key 经 AES-256-GCM 加密后存储于数据库，页面仅显示脱敏值，
          生成报告时由服务端解密使用。
        </p>
        <div className="mt-4">
          <ApiKeyConfig />
        </div>

        <ApiKeyGuide />
      </section>

      <section className="mt-12 border-t border-line pt-8">
        <h2 className="text-sm font-medium text-ink">投资人画像</h2>
        <p className="mt-1 text-xs leading-5 text-ink-faint">
          帮助 AI 更好地理解你的偏好，所有分析将更贴合你的判断风格。
          所有字段均可留空，填写后会在调用大模型时前置注入到 system prompt。
        </p>
        <div className="mt-6">
          <ProfileForm />
        </div>
      </section>

      <footer className="mt-12 border-t border-line pt-6 text-xs text-ink-faint">
        使用即表示同意{" "}
        <Link href="/legal/terms" className="hover:underline">
          用户协议
        </Link>{" "}
        ·{" "}
        <Link href="/legal/disclaimer" className="hover:underline">
          免责声明
        </Link>
      </footer>
    </div>
  );
}

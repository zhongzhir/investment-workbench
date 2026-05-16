import Link from "next/link";
import { getSession } from "@/lib/auth";

// 首页：以文档为中心的概览，大量留白，引导进入核心动线。
const QUICK_ACTIONS = [
  {
    href: "/projects/new",
    title: "新建项目分析",
    desc: "上传 BP，输入 3–10 条判断要点，AI 生成分析报告初稿。",
  },
  {
    href: "/knowledge",
    title: "管理知识库",
    desc: "沉淀历史文档与判断，构建私有的、越用越懂你的知识体系。",
  },
  {
    href: "/archive",
    title: "查看归档",
    desc: "浏览已完成的项目分析报告，导出 Word 文档。",
  },
];

const STEPS = [
  "上传 BP（PDF / Word）",
  "输入 3–10 条判断要点",
  "AI 生成分析报告初稿",
  "多轮自然语言修改",
  "导出 Word 文档",
];

export default async function HomePage() {
  const session = await getSession();
  const user = session?.user;

  return (
    <div className="mx-auto max-w-doc px-6 py-16">
      <p className="text-sm text-ink-faint">
        {user ? `欢迎回来，${user.name}` : "欢迎"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">
        今天要分析哪个项目？
      </h1>
      <p className="mt-3 prose-doc text-ink-soft">
        投资工作台帮助你把分散的投资判断沉淀为可调用的知识资产，
        并借助 AI 加速分析报告的生成与打磨。
      </p>

      {!user && (
        <Link
          href="/login"
          className="mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          登录后开始
        </Link>
      )}

      <section className="mt-12">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          快速开始
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="rounded-lg border border-line p-4 transition-colors hover:border-accent hover:bg-accent-soft/40"
            >
              <div className="text-sm font-medium text-ink">{a.title}</div>
              <div className="mt-1.5 text-xs leading-5 text-ink-faint">
                {a.desc}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          MVP 核心动线
        </h2>
        <ol className="mt-4 space-y-2">
          {STEPS.map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm text-ink-soft">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-medium text-ink-faint">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

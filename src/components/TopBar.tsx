"use client";

import Link from "next/link";

// HelpCircle 图标（与 lucide-react 视觉一致的内联 SVG，避免单图标引依赖）
function HelpCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// 顶栏：保持克制，仅放置主操作入口。
export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-canvas px-6">
      <div className="text-sm text-ink-faint">
        以私有知识库为核心的投资分析工作台
      </div>
      <div className="flex items-center gap-3">
        <Link
          href="/help"
          title="使用说明"
          aria-label="使用说明"
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          <HelpCircleIcon className="h-5 w-5" />
        </Link>
        <Link
          href="/projects/new"
          className="rounded-lg bg-[#1B6FE8] px-3.5 py-1.5 text-sm font-medium tracking-[0.01em] text-white transition-colors duration-150 hover:bg-[#1762d0]"
        >
          新建项目分析
        </Link>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";

// 顶栏：保持克制，仅放置主操作入口。
export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-canvas px-6">
      <div className="text-sm text-ink-faint">
        以私有知识库为核心的投资分析工作台
      </div>
      <Link
        href="/projects/new"
        className="rounded-md bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
      >
        新建项目分析
      </Link>
    </header>
  );
}

import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
  status: string;
  updated_at: string;
  file_count: number;
  report_count: number;
}

const STATUS_LABEL: Record<string, string> = {
  evaluating: "评估中",
  invested: "已投",
  passed: "已 Pass",
  exited: "已退出",
};

export default async function ArchivePage() {
  const session = await requireAuth();

  let projects: ProjectRow[] = [];
  try {
    projects = await query<ProjectRow>(
      `SELECT p.id, p.name, p.industry, p.stage, p.status, p.updated_at,
              (SELECT COUNT(*)::int FROM documents d WHERE d.project_id = p.id) AS file_count,
              (SELECT COUNT(*)::int FROM reports r WHERE r.project_id = p.id) AS report_count
         FROM projects p
        WHERE p.user_id = $1
        ORDER BY p.updated_at DESC`,
      [session.user.id]
    );
  } catch (e) {
    console.error("[archive] 数据读取失败:", e);
  }

  return (
    <div className="mx-auto max-w-doc px-6 py-10">
      <h1 className="text-xl font-semibold text-ink">项目档案</h1>
      <p className="mt-1 text-sm text-ink-soft">
        每个项目的完整生命周期记录
      </p>

      {projects.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🗂️"
            title="还没有项目档案"
            description="创建项目后，所有文件、报告、判断与跟踪都会汇集到这里"
            action={{ label: "新建项目分析", href: "/projects/new" }}
          />
        </div>
      ) : (
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/archive/${p.id}`}
              className="card-base card-hover block p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="line-clamp-1 flex-1 text-sm font-medium text-slate-800">
                  {p.name}
                </span>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500">
                {p.industry || "未分类"}
                {p.stage && ` · ${p.stage}`}
              </p>
              <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                <span>📎 {p.file_count} 个文件</span>
                <span>📄 {p.report_count} 份报告</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                更新于 {new Date(p.updated_at).toLocaleDateString("zh-CN")}
              </p>
            </Link>
          ))}
        </div>
      )}

    </div>
  );
}

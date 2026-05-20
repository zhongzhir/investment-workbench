import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  latest_report_id: string | null;
  latest_report_status: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  evaluating: "评估中",
  invested: "已投",
  passed: "已 Pass",
  exited: "已退出",
};

export default async function ProjectsPage() {
  const session = await requireAuth();

  const projects = await query<ProjectRow>(
    `SELECT p.id, p.name, p.company_name, p.industry, p.status, p.created_at,
            r.id AS latest_report_id, r.status AS latest_report_status
       FROM projects p
       LEFT JOIN LATERAL (
         SELECT id, status FROM reports
          WHERE project_id = p.id
          ORDER BY updated_at DESC LIMIT 1
       ) r ON true
      WHERE p.user_id = $1
      ORDER BY p.created_at DESC`,
    [session.user.id]
  );

  return (
    <div className="mx-auto max-w-doc px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">项目分析</h1>
        <Link
          href="/projects/new"
          className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
        >
          新建项目
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon="🗂️"
            title="还没有项目"
            description="创建第一个项目，上传 BP 开始分析"
            action={{ label: "新建项目分析", href: "/projects/new" }}
          />
        </div>
      ) : (
        <ul className="mt-8 space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block rounded-lg border border-line p-4 transition-colors hover:border-accent hover:bg-accent-soft/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-ink">
                      {p.name}
                    </div>
                    <div className="mt-1 truncate text-xs text-ink-faint">
                      {[p.company_name, p.industry]
                        .filter(Boolean)
                        .join(" · ") || "未填写公司 / 行业"}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-xs text-ink-soft">
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-faint">
                  <span>
                    {new Date(p.created_at).toLocaleDateString("zh-CN")}
                  </span>
                  <span>·</span>
                  <span>
                    {p.latest_report_id
                      ? p.latest_report_status === "finalized"
                        ? "报告已定稿"
                        : "报告草稿"
                      : "尚无报告"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

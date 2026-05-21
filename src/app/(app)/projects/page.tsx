import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState } from "@/components/ui/EmptyState";
import { sleepDays } from "@/lib/projectSleep";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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
    `SELECT p.id, p.name, p.company_name, p.industry, p.status,
            p.created_at, p.updated_at,
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
          <DemoCards />
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
                  <div className="flex shrink-0 items-center gap-2">
                    {(() => {
                      const d = sleepDays(p.status, p.updated_at);
                      if (d == null) return null;
                      return (
                        <span className="rounded-full border border-[#FF6B35] bg-[#FF6B3510] px-2 py-0.5 text-xs text-[#FF6B35]">
                          ⏰ 已沉睡 {d} 天
                        </span>
                      );
                    })()}
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-ink-soft">
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-faint">
                  <span>
                    {new Date(p.created_at).toLocaleDateString("zh-CN")}
                  </span>
                  <span>·</span>
                  <span>
                    上次更新：
                    {new Date(p.updated_at).toLocaleDateString("zh-CN")}
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

      {/* 示例项目入口（任何状态下都展示，便于已有项目的用户也能去看） */}
      {projects.length > 0 && (
        <div className="mt-12 border-t border-slate-200 pt-6">
          <DemoCards />
        </div>
      )}
    </div>
  );
}

function DemoCards() {
  const demos = [
    {
      href: "/demo/consumer",
      icon: "🍵",
      title: "野兽派茶（消费品牌）",
      desc: "新消费 · Pre-A · 2000 万",
    },
    {
      href: "/demo/saas",
      icon: "🔌",
      title: "DataSync Pro（企业 SaaS）",
      desc: "数据集成中间件 · A 轮 · 5000 万",
    },
  ];
  return (
    <div className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
        示例项目 · 只读
      </p>
      <p className="mt-1 text-xs text-slate-400">
        无需登录即可浏览，看看 Aivestor 生成的报告长什么样
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {demos.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="card-base card-hover block p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{d.icon}</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{d.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{d.desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

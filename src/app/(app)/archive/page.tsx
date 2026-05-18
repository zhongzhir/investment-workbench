import Link from "next/link";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { outcomeDef } from "@/lib/outcome";

export const dynamic = "force-dynamic";

interface InvestedProject {
  id: string;
  name: string;
  industry: string | null;
  outcome: string;
  outcome_at: string | null;
  latest_update: string | null;
}

interface IndustryRow {
  industry: string;
  count: number;
}

export default async function ArchivePage() {
  const session = await requireAuth();

  let stats = { invested: 0, tracking: 0, exited: 0 };
  let invested: InvestedProject[] = [];
  let industries: IndustryRow[] = [];

  try {
    const countRows = await query<typeof stats>(
      `SELECT
         count(*) FILTER (WHERE outcome = 'invested')::int AS invested,
         count(*) FILTER (WHERE process_stage = 'post_investment')::int AS tracking,
         count(*) FILTER (WHERE outcome IN ('exited_profit', 'exited_loss'))::int AS exited
       FROM projects WHERE user_id = $1`,
      [session.user.id]
    );
    if (countRows[0]) stats = countRows[0];

    invested = await query<InvestedProject>(
      `SELECT p.id, p.name, p.industry, p.outcome, p.outcome_at,
              u.content AS latest_update
         FROM projects p
         LEFT JOIN LATERAL (
           SELECT content FROM post_investment_updates
            WHERE project_id = p.id
            ORDER BY created_at DESC LIMIT 1
         ) u ON true
        WHERE p.user_id = $1 AND p.outcome = 'invested'
        ORDER BY p.outcome_at DESC NULLS LAST`,
      [session.user.id]
    );

    industries = await query<IndustryRow>(
      `SELECT COALESCE(NULLIF(industry, ''), '未分类') AS industry,
              count(*)::int AS count
         FROM projects
        WHERE user_id = $1 AND outcome = 'invested'
        GROUP BY 1 ORDER BY count DESC`,
      [session.user.id]
    );
  } catch (e) {
    console.error("[archive] 数据读取失败:", e);
  }

  return (
    <div className="mx-auto max-w-doc px-6 py-10">
      <h1 className="text-xl font-semibold text-ink">投后管理</h1>

      {/* 投资组合概览 */}
      <h2 className="mt-8 text-xs font-medium uppercase tracking-wide text-ink-faint">
        投资组合概览
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-3">
        <StatCard label="已投项目" value={stats.invested} />
        <StatCard label="跟踪中" value={stats.tracking} />
        <StatCard label="已退出" value={stats.exited} />
      </div>

      {industries.length > 0 && (
        <p className="mt-3 text-xs text-ink-soft">
          行业分布：
          {industries.map((it, i) => (
            <span key={it.industry}>
              {i > 0 && " | "}
              {it.industry} {it.count}
            </span>
          ))}
        </p>
      )}

      {/* 已投项目列表 */}
      <h2 className="mt-8 text-xs font-medium uppercase tracking-wide text-ink-faint">
        已投项目列表
      </h2>
      {invested.length === 0 ? (
        <div className="mt-3 rounded-lg border border-dashed border-line py-16 text-center">
          <p className="text-sm text-ink-soft">暂无已投项目</p>
          <p className="mt-1 text-xs text-ink-faint">
            在项目页将投资结果标记为「已投资」后，项目会出现在这里。
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {invested.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{p.name}</span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium ${
                    outcomeDef(p.outcome).badgeClass
                  }`}
                >
                  {outcomeDef(p.outcome).icon} {outcomeDef(p.outcome).label}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-faint">
                {p.industry || "未分类行业"}
                {p.outcome_at &&
                  ` · 投资于 ${new Date(p.outcome_at).toLocaleDateString(
                    "zh-CN"
                  )}`}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="line-clamp-1 flex-1 text-xs text-ink-soft">
                  最近更新：{p.latest_update || "暂无跟踪记录"}
                </p>
                <Link
                  href={`/projects/${p.id}`}
                  className="shrink-0 text-xs font-medium text-accent hover:underline"
                >
                  查看详情 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4 text-center">
      <div className="text-xs text-ink-faint">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value} 个</div>
    </div>
  );
}

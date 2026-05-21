import Link from "next/link";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { OnboardingGate } from "@/components/onboarding/OnboardingGate";
import { sleepDays } from "@/lib/projectSleep";

// 首页（/dashboard）：以文档为中心的概览，大量留白，引导进入核心动线。
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
    title: "查看项目档案",
    desc: "浏览项目的全生命周期记录：文件、报告、判断与跟踪。",
  },
];

interface RecentProject {
  id: string;
  name: string;
  status: string;
  updated_at: string;
}

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const hour = 3_600_000;
  const day = 24 * hour;
  if (diff < hour) return "刚刚";
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function DashboardPage() {
  const session = await getSession();
  const user = session?.user;

  const recentProjects = user
    ? await query<RecentProject>(
        `SELECT id, name, status, updated_at FROM projects
          WHERE user_id = $1
          ORDER BY updated_at DESC
          LIMIT 5`,
        [user.id]
      )
    : [];

  // 计算沉睡项目（active 状态 + 超过 14 天未更新）
  // 用更宽的查询拿所有 active 项目，对比阈值。
  type SleepRow = { id: string; name: string; updated_at: string; status: string };
  let sleepingRaw: SleepRow[] = [];
  if (user) {
    try {
      sleepingRaw = await query<SleepRow>(
        `SELECT id, name, status, updated_at
           FROM projects
          WHERE user_id = $1 AND status IN ('evaluating', 'invested')
          ORDER BY updated_at ASC`,
        [user.id]
      );
    } catch {
      sleepingRaw = [];
    }
  }
  const sleeping = sleepingRaw
    .map((p) => ({ ...p, days: sleepDays(p.status, p.updated_at) }))
    .filter(
      (p): p is SleepRow & { days: number } => p.days !== null
    );

  // 引导弹窗：三个条件同时满足才弹（未完成引导 + 没有项目 + 没有 API Key）
  // 任意一个不满足都说明用户已经"上手"，不再打扰
  let showOnboarding = false;
  if (user) {
    try {
      const rows = await query<{
        onboarding_completed: boolean | null;
        api_key_encrypted: string | null;
      }>(
        "SELECT onboarding_completed, api_key_encrypted FROM users WHERE id = $1",
        [user.id]
      );
      const row = rows[0];
      const completed = !!row?.onboarding_completed;
      const hasApiKey = !!row?.api_key_encrypted;

      const countRows = await query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM projects WHERE user_id = $1",
        [user.id]
      );
      const hasProjects = Number(countRows[0]?.count ?? 0) > 0;

      showOnboarding = !completed && !hasProjects && !hasApiKey;
    } catch {
      // 查询失败时不弹（容错优先：避免老用户重复看到弹窗）
      showOnboarding = false;
    }
  }

  return (
    <div className="mx-auto max-w-doc px-6 py-16">
      <OnboardingGate show={showOnboarding} />
      <p className="text-sm text-ink-faint">
        {user ? `欢迎回来，${user.name}` : "欢迎"}
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">
        今天要分析哪个项目？
      </h1>
      <p className="mt-3 prose-doc text-ink-soft">
        Aivestor 帮助你把分散的投资判断沉淀为可调用的知识资产，
        并借助 AI 加速分析报告的生成与打磨。
      </p>

      {/* 沉睡项目提醒：仅在有沉睡项目时渲染 */}
      {sleeping.length > 0 && (
        <div className="mt-6 rounded-xl border-l-4 border-[#FF6B35] bg-[#FF6B3508] px-4 py-3">
          <p className="text-sm font-medium text-[#FF6B35]">
            ⏰ 有 {sleeping.length} 个项目超过 14 天未更新
          </p>
          <ul className="mt-2 space-y-1.5">
            {sleeping.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <span className="truncate text-ink-soft">
                  · {p.name} · 已沉睡 {p.days} 天
                </span>
                <Link
                  href={`/projects/${p.id}`}
                  className="shrink-0 text-xs font-medium text-[#FF6B35] hover:underline"
                >
                  去查看 →
                </Link>
              </li>
            ))}
          </ul>
          {sleeping.length > 5 && (
            <p className="mt-1.5 text-xs text-slate-400">
              共 {sleeping.length} 个，查看
              <Link href="/projects" className="ml-1 text-[#FF6B35] hover:underline">
                完整项目列表
              </Link>
            </p>
          )}
        </div>
      )}

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
          最近项目
        </h2>
        {recentProjects.length === 0 ? (
          <p className="mt-4 text-center text-sm text-ink-soft">
            还没有项目。点击右上角「新建项目分析」开始。
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {recentProjects.map((p) => {
              const isActive =
                p.status === "evaluating" || p.status === "invested";
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-4 rounded-md px-2 py-3 transition-colors hover:bg-surface"
                  >
                    <span className="flex-1 truncate text-sm font-medium text-ink">
                      {p.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          isActive ? "bg-green-500" : "bg-ink-faint"
                        }`}
                      />
                      {isActive ? "进行中" : "已归档"}
                    </span>
                    <span className="shrink-0 text-xs text-ink-faint">
                      {relativeTime(p.updated_at)}
                    </span>
                    <span className="shrink-0 text-xs font-medium text-accent">
                      继续 →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

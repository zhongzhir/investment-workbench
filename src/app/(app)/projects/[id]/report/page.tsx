import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { ReportView } from "@/components/project/ReportView";

export const dynamic = "force-dynamic";

interface ReportRow {
  id: string;
  content: string;
  conversation_history: { instruction: string; ts: string }[];
}

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { generate?: string; reportId?: string };
}) {
  const session = await requireAuth();

  const projects = await query<{
    name: string;
    financial_data: import("@/lib/types").FinancialData | null;
  }>(
    "SELECT name, financial_data FROM projects WHERE id = $1 AND user_id = $2",
    [params.id, session.user.id]
  );
  if (projects.length === 0) notFound();

  // 指定了 reportId 时打开该条报告；否则回退到最新报告（向后兼容）
  let report: ReportRow | undefined;
  if (searchParams.reportId) {
    const specific = await query<ReportRow>(
      `SELECT id, content, conversation_history
         FROM reports
        WHERE id = $1 AND project_id = $2 AND user_id = $3`,
      [searchParams.reportId, params.id, session.user.id]
    );
    report = specific[0];
  }
  if (!report) {
    const reports = await query<ReportRow>(
      `SELECT id, content, conversation_history
         FROM reports
        WHERE project_id = $1 AND user_id = $2
        ORDER BY updated_at DESC LIMIT 1`,
      [params.id, session.user.id]
    );
    report = reports[0];
  }

  return (
    <ReportView
      projectId={params.id}
      projectName={projects[0].name}
      initialReportId={report?.id ?? null}
      initialContent={report?.content ?? ""}
      initialHistory={report?.conversation_history ?? []}
      initialFinancialData={projects[0].financial_data}
      autoGenerate={searchParams.generate === "1"}
    />
  );
}

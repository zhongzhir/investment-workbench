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
  searchParams: { generate?: string };
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

  const reports = await query<ReportRow>(
    `SELECT id, content, conversation_history
       FROM reports
      WHERE project_id = $1 AND user_id = $2
      ORDER BY updated_at DESC LIMIT 1`,
    [params.id, session.user.id]
  );
  const latest = reports[0];

  return (
    <ReportView
      projectId={params.id}
      projectName={projects[0].name}
      initialReportId={latest?.id ?? null}
      initialContent={latest?.content ?? ""}
      initialHistory={latest?.conversation_history ?? []}
      initialFinancialData={projects[0].financial_data}
      autoGenerate={searchParams.generate === "1"}
    />
  );
}

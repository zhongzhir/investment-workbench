import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { query } from "@/lib/db";
import { ProjectDetail } from "@/components/project/ProjectDetail";
import type { FinancialData } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ProjectRow {
  id: string;
  name: string;
  judgment_points: string[];
  financial_data: FinancialData | null;
}

interface DocRow {
  filename: string;
  chars: number;
  extracted_text: string | null;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await requireAuth();

  const projects = await query<ProjectRow>(
    `SELECT id, name, judgment_points, financial_data
       FROM projects WHERE id = $1 AND user_id = $2`,
    [params.id, session.user.id]
  );
  if (projects.length === 0) notFound();
  const project = projects[0];

  const docs = await query<DocRow>(
    `SELECT filename,
            COALESCE(char_length(extracted_text), 0) AS chars,
            extracted_text
       FROM documents
      WHERE project_id = $1
      ORDER BY created_at ASC`,
    [params.id]
  );

  const bpText = docs
    .map((d) => d.extracted_text)
    .filter(Boolean)
    .join("\n\n---\n\n");

  const latest = await query<{ id: string }>(
    "SELECT id FROM reports WHERE project_id = $1 ORDER BY updated_at DESC LIMIT 1",
    [params.id]
  );

  return (
    <ProjectDetail
      projectId={project.id}
      projectName={project.name}
      bpText={bpText}
      docMeta={docs.map((d) => ({ filename: d.filename, chars: d.chars }))}
      initialPoints={
        Array.isArray(project.judgment_points) ? project.judgment_points : []
      }
      latestReportId={latest[0]?.id ?? null}
      initialFinancialData={project.financial_data}
    />
  );
}

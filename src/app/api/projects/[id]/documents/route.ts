import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { parseDocument } from "@/lib/parser";

export const maxDuration = 120;

// POST /api/projects/[id]/documents — 从 Blob URL 拉取 BP 文件并解析文本
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 校验项目归属
  const owned = await query<{ id: string }>(
    "SELECT id FROM projects WHERE id = $1 AND user_id = $2",
    [params.id, session.user.id]
  );
  if (owned.length === 0) {
    return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  }

  let body: { blobUrl?: string; filename?: string; fileType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const { blobUrl, filename, fileType: fileTypeRaw } = body;
  if (!blobUrl || !filename) {
    return NextResponse.json({ error: "缺少文件信息" }, { status: 400 });
  }

  const fileType = fileTypeRaw as "pdf" | "docx" | null;
  if (!fileType || !["pdf", "docx"].includes(fileType)) {
    return NextResponse.json(
      { error: "仅支持 PDF 与 Word(.docx) 格式" },
      { status: 400 }
    );
  }

  const fetchRes = await fetch(blobUrl, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  });
  if (!fetchRes.ok) {
    return NextResponse.json({ error: "文件读取失败" }, { status: 422 });
  }
  const buffer = Buffer.from(await fetchRes.arrayBuffer());

  // 解析文本
  let parsed;
  console.log("[documents] 开始解析，fileType:", fileType, "bufferSize:", buffer.length);
  try {
    parsed = await parseDocument(buffer, fileType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : "";
    return NextResponse.json(
      { error: `文档解析失败：${msg}`, detail: stack },
      { status: 422 }
    );
  }

  if (parsed.charCount === 0) {
    return NextResponse.json(
      { error: "未能从文档中提取到文字，请确认该 PDF 非扫描件，或尝试转换为可选中文字的 PDF 格式" },
      { status: 422 }
    );
  }

  // 文件已存于 Vercel Blob，直接记录其 URL
  const fileUrl = blobUrl;

  const rows = await query<{ id: string }>(
    `INSERT INTO documents
       (user_id, project_id, filename, file_type, file_url, file_size,
        doc_kind, extracted_text, parse_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'bp', $7, 'done')
     RETURNING id`,
    [
      session.user.id,
      params.id,
      filename,
      fileType,
      fileUrl,
      buffer.length,
      parsed.text,
    ]
  );

  return NextResponse.json(
    {
      id: rows[0].id,
      filename,
      charCount: parsed.charCount,
    },
    { status: 201 }
  );
}

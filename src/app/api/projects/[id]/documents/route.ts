import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { detectFileType, parseDocument } from "@/lib/parser";

export const maxDuration = 120;

const UPLOAD_DIR = join(process.cwd(), "tmp", "uploads");

// POST /api/projects/[id]/documents — 上传 BP 文件并解析文本
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "未收到文件" }, { status: 400 });
  }

  const fileType = detectFileType(file.name, file.type);
  if (!fileType) {
    return NextResponse.json(
      { error: "仅支持 PDF 与 Word(.docx) 格式" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

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

  // 落盘保存原始文件（本地开发；生产可替换为对象存储）
  let fileUrl: string | null = null;
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    await writeFile(join(UPLOAD_DIR, safeName), buffer);
    fileUrl = `/tmp/uploads/${safeName}`;
  } catch {
    // 落盘失败不阻断流程，extracted_text 已足够支撑后续生成
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO documents
       (user_id, project_id, filename, file_type, file_url, file_size,
        doc_kind, extracted_text, parse_status)
     VALUES ($1, $2, $3, $4, $5, $6, 'bp', $7, 'done')
     RETURNING id`,
    [
      session.user.id,
      params.id,
      file.name,
      fileType,
      fileUrl,
      buffer.length,
      parsed.text,
    ]
  );

  return NextResponse.json(
    {
      id: rows[0].id,
      filename: file.name,
      charCount: parsed.charCount,
    },
    { status: 201 }
  );
}

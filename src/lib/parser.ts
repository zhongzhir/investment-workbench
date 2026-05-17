import mammoth from "mammoth";
import { extractText } from "unpdf";

// 文档解析：从 PDF / Word 提取纯文本，供 AI 与知识库使用。
// 仅在服务端运行（API 路由内调用）。

export type ParsableFileType = "pdf" | "docx";

export interface ParseResult {
  text: string;
  charCount: number;
}

// 由文件名 / MIME 推断类型；不支持的格式返回 null。
export function detectFileType(
  filename: string,
  mime?: string
): ParsableFileType | null {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf") || mime === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  return null;
}

export async function parseDocument(
  buffer: Buffer,
  fileType: ParsableFileType
): Promise<ParseResult> {
  let text = "";

  if (fileType === "pdf") {
    // unpdf：专为 serverless 环境设计的 PDF 文本提取
    console.log("[parser] unpdf extractText 开始，buffer大小:", buffer.length);
    const { text: pages } = await extractText(new Uint8Array(buffer), {
      mergePages: true,
    });
    text = Array.isArray(pages) ? pages.join("\n") : String(pages);
    console.log("[parser] extractText 完成，文本长度:", text.length);
  } else {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  }

  // 折叠多余空行，去首尾空白
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return { text, charCount: text.length };
}

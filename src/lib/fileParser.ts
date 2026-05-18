// 统一文件解析：PDF / Word / PPT / Excel → 纯文本。
// 仅在服务端运行（API 路由内调用）。

import * as XLSX from "xlsx";
import { parseDocument } from "@/lib/parser";

export type ParsableType = "pdf" | "docx" | "pptx" | "xlsx" | "xls";

export interface ParseFileResult {
  text: string;
  warning?: string;
}

const EXCEL_WARNING =
  "Excel文件已提取文本，财务数据建议使用专项解析功能";

// 由文件名后缀推断统一文件类型；无法识别返回空字符串。
export function getFileType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    pdf: "pdf",
    doc: "docx",
    docx: "docx",
    ppt: "pptx",
    pptx: "pptx",
    xls: "xls",
    xlsx: "xlsx",
  };
  return typeMap[ext || ""] || "";
}

// 解析 Excel：遍历所有 sheet，拼成「Sheet名称\n内容」文本块。
function parseExcel(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const blocks: string[] = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const content = XLSX.utils.sheet_to_csv(sheet).trim();
    if (content) {
      blocks.push(`${sheetName}\n${content}`);
    }
  }
  return blocks.join("\n\n");
}

export async function parseFile(
  buffer: Buffer,
  fileType: string,
  fileName: string
): Promise<ParseFileResult> {
  switch (fileType) {
    case "pdf":
    case "docx": {
      // 复用现有 unpdf / mammoth 解析逻辑
      const { text } = await parseDocument(buffer, fileType);
      return { text };
    }
    case "pptx": {
      // officeparser 提取 PPT 文本
      const { parseOffice } = await import("officeparser");
      const ast = await parseOffice(buffer);
      const text = ast.toText().replace(/\n{3,}/g, "\n\n").trim();
      return { text };
    }
    case "xlsx":
    case "xls": {
      const text = parseExcel(buffer).replace(/\n{3,}/g, "\n\n").trim();
      return { text, warning: EXCEL_WARNING };
    }
    default:
      throw new Error(`不支持的文件格式: ${fileType || fileName}`);
  }
}

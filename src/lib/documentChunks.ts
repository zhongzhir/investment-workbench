// 文档分块处理：将文档文本切分、逐块向量化并写入 document_chunks 表。

import { query } from "@/lib/db";
import { getEmbedding } from "@/lib/embedding";
import { chunkText } from "@/lib/chunking";

// 对单篇文档执行 chunking + embedding 并写入 document_chunks。
// embedding 失败不阻断写入，仍保存 chunk 文本以供全文检索回退。
export async function processDocumentChunks(
  documentId: string,
  userId: string,
  extractedText: string,
  provider: string | null,
  apiKey: string | null
): Promise<void> {
  try {
    const chunks = chunkText(extractedText);
    if (chunks.length === 0) return;

    for (const chunk of chunks) {
      let vector: number[] | null = null;

      if (provider && apiKey) {
        try {
          const res = await getEmbedding(chunk.content, provider, apiKey);
          vector = res?.vector ?? null;
        } catch (e) {
          console.error(`[chunks] ${chunk.chunkIndex} embedding 失败:`, e);
        }
      }

      await query(
        `INSERT INTO document_chunks
           (document_id, user_id, chunk_index, content, token_count, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          documentId,
          userId,
          chunk.chunkIndex,
          chunk.content,
          chunk.tokenCount,
          vector ? `[${vector.join(",")}]` : null,
          JSON.stringify(chunk.metadata),
        ]
      );
    }

    console.log(`[chunks] 文档 ${documentId}：处理 ${chunks.length} 个 chunk`);
  } catch (e) {
    // chunking 失败不影响主流程
    console.error("[chunks] processDocumentChunks 出错:", e);
  }
}

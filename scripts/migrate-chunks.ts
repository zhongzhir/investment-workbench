// 历史文档迁移：对已解析但尚无 chunk 记录的 documents 补跑 chunking + embedding。
//
// 执行：
//   npm run db:migrate-chunks
// （等价于 node --env-file=.env.local -r ts-node/register -r tsconfig-paths/register scripts/migrate-chunks.ts）

import { pool, query } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { processDocumentChunks } from "@/lib/documentChunks";

interface DocRow {
  id: string;
  user_id: string;
  extracted_text: string | null;
  ai_provider: string | null;
  api_key_encrypted: string | null;
}

async function migrateChunks(): Promise<void> {
  // 已解析完成、且在 document_chunks 中尚无记录的文档
  const docs = await query<DocRow>(`
    SELECT d.id, d.user_id, d.extracted_text, u.ai_provider, u.api_key_encrypted
      FROM documents d
      JOIN users u ON d.user_id = u.id
     WHERE d.parse_status = 'done'
       AND d.extracted_text IS NOT NULL
       AND d.id NOT IN (SELECT DISTINCT document_id FROM document_chunks)
  `);

  console.log(`找到 ${docs.length} 篇待迁移文档`);

  let ok = 0;
  for (const doc of docs) {
    let apiKey: string | null = null;
    if (doc.api_key_encrypted) {
      try {
        apiKey = decrypt(doc.api_key_encrypted);
      } catch {
        apiKey = null;
      }
    }

    console.log(`迁移文档 ${doc.id} ...`);
    await processDocumentChunks(
      doc.id,
      doc.user_id,
      doc.extracted_text ?? "",
      doc.ai_provider,
      apiKey
    );
    ok++;
  }

  console.log(`迁移完成：${ok}/${docs.length}`);
}

migrateChunks()
  .catch((err) => {
    console.error("迁移失败：", err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

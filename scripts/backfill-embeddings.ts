// 补全脚本：为 document_chunks / knowledge_base_entries 中 embedding 为空的记录
// 调用阿里云百炼 text-embedding-v4 批量补全向量。
//
// 执行：npm run db:backfill-embeddings
// 需在 .env.local 中配置 DATABASE_URL 与 BAILIAN_API_KEY。

import { generateEmbeddingWithBailian } from '../src/lib/embedding';
import { pool, query } from '../src/lib/db';

async function backfill(table: string, contentCol: string, hasModelCol: boolean) {
  // query() 直接返回行数组（Promise<T[]>）
  const rows = await query<{ id: string; [k: string]: unknown }>(
    `SELECT id, ${contentCol} FROM ${table} WHERE embedding IS NULL AND ${contentCol} IS NOT NULL ORDER BY created_at LIMIT 1000`
  );
  console.log(`[${table}] 需要补全：${rows.length} 条`);
  if (rows.length === 0) return;

  const BATCH = 20;
  let done = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const texts = batch.map((r) => r[contentCol] as string);
    const embeddings = await generateEmbeddingWithBailian(texts);
    if (!embeddings) { console.log('BAILIAN_API_KEY 未配置，跳过'); return; }

    for (let j = 0; j < batch.length; j++) {
      const vector = embeddings[j]?.vector;
      if (!vector) continue;
      const literal = `[${vector.join(',')}]`;
      if (hasModelCol) {
        await query(
          `UPDATE ${table} SET embedding = $1, embedding_model = $2 WHERE id = $3`,
          [literal, 'text-embedding-v4', batch[j].id]
        );
      } else {
        await query(
          `UPDATE ${table} SET embedding = $1 WHERE id = $2`,
          [literal, batch[j].id]
        );
      }
    }
    done += batch.length;
    console.log(`[${table}] 已处理 ${done} / ${rows.length}`);
  }
}

async function main() {
  await backfill('document_chunks', 'content', false);
  await backfill('knowledge_base_entries', 'content', true);
  await pool.end();
  console.log('全部完成');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

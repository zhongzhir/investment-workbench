-- ============================================================
-- 迁移 003：文档分块表 document_chunks
-- ============================================================
-- 将上传文档切分为 chunk 后分别向量化，提升语义检索精度。
-- 幂等：所有语句均可重复执行（IF NOT EXISTS）。
-- 依赖：vector 扩展（已由 schema.sql 创建）。
-- ============================================================

CREATE TABLE IF NOT EXISTS document_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  content      TEXT NOT NULL,
  token_count  INTEGER,
  embedding    VECTOR(1536),
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id
  ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id
  ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

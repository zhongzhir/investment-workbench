-- ============================================================
-- 迁移 002：知识库补充 embedding_model / source_type / tags / 全文检索
-- ============================================================
-- 幂等：所有语句均可重复执行（IF NOT EXISTS）。
-- ============================================================

-- 记录条目使用的 embedding 模型
ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS embedding_model TEXT;

-- 条目来源类型（manual 手动录入 / document 项目文档 / report 分析报告 等）
ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS source_type TEXT;

-- 条目标签
ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS tags JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 全文检索向量（中英文混合，用 simple 配置兜底）
ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(content, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_kb_search_vector
  ON knowledge_base_entries USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS idx_kb_user_created
  ON knowledge_base_entries(user_id, created_at DESC);

-- ============================================================
-- 迁移 012：对话沉淀 —— 知识库支持对话提炼条目
--   - knowledge_base_entries 新增 structured_data / source_report_id / review_status
--   - 放宽 entry_type 的 CHECK 约束，纳入 manual / conversation_digest / document_chunk
-- 幂等：可重复执行。
-- ============================================================

-- 1. 放宽 entry_type 的取值
ALTER TABLE knowledge_base_entries
  DROP CONSTRAINT IF EXISTS knowledge_base_entries_entry_type_check;

ALTER TABLE knowledge_base_entries
  ADD CONSTRAINT knowledge_base_entries_entry_type_check
  CHECK (entry_type IN (
    'industry', 'project', 'thesis', 'prediction', 'chunk',
    'manual', 'conversation_digest', 'document_chunk'
  ));

-- 2. 新增字段
ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS structured_data JSONB DEFAULT NULL;

ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS source_report_id UUID
    REFERENCES reports(id) ON DELETE SET NULL DEFAULT NULL;

ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS review_status VARCHAR(10) DEFAULT 'approved';

-- 3. 历史数据补全
UPDATE knowledge_base_entries
   SET review_status = 'approved'
 WHERE review_status IS NULL;

-- 4. 便于按报告反查
CREATE INDEX IF NOT EXISTS idx_kb_source_report
  ON knowledge_base_entries(source_report_id);

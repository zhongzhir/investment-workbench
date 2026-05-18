-- ============================================================
-- 迁移 008：项目投资结果（outcome）字段
-- ============================================================
-- 用于认知进化分析：记录项目最终结果，回溯判断准确性。
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS outcome VARCHAR(20)
  CHECK (outcome IN ('invested', 'passed', 'exited_profit', 'exited_loss', 'pending'));

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS outcome_note TEXT;

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS outcome_at TIMESTAMP WITH TIME ZONE;

-- ============================================================
-- 迁移 015：自建 SKILL 元数据
--   user_custom_skills.metadata：记录导入 / 自动生成等来源信息
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE user_custom_skills
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

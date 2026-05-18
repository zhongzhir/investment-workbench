-- ============================================================
-- 迁移 004：认知演变 — 项目流程阶段 + 结构化判断记录
-- ============================================================
-- 注意：projects.stage 已用于「融资轮次」（天使/Pre-A/A...），
--       本迁移新增 process_stage 表示「投资流程阶段」，二者互不影响。
-- 幂等：所有语句均可重复执行。
-- ============================================================

-- ------------------------------------------------------------
-- 1. projects 新增投资流程阶段
--    screening 初筛 / due_diligence 尽调 / investment_committee 投委会
--    / post_investment 投后管理 / passed 已Pass / exited 已退出
-- ------------------------------------------------------------
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS process_stage TEXT NOT NULL DEFAULT 'screening';

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS process_stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- ------------------------------------------------------------
-- 2. investment_judgments 新增结构化判断字段
-- ------------------------------------------------------------
ALTER TABLE investment_judgments
  ADD COLUMN IF NOT EXISTS bull_case TEXT;
ALTER TABLE investment_judgments
  ADD COLUMN IF NOT EXISTS bear_case TEXT;
ALTER TABLE investment_judgments
  ADD COLUMN IF NOT EXISTS founder_assessment TEXT;
ALTER TABLE investment_judgments
  ADD COLUMN IF NOT EXISTS key_hypothesis TEXT;
ALTER TABLE investment_judgments
  ADD COLUMN IF NOT EXISTS confidence_level INTEGER
    CHECK (confidence_level IS NULL OR confidence_level BETWEEN 1 AND 5);

-- 结构化判断记录不一定有正文，content 改为可空
ALTER TABLE investment_judgments
  ALTER COLUMN content DROP NOT NULL;

-- 旧的 stage CHECK 仅允许 initial/due_diligence/decision/post_invest/exit，
-- 与新流程阶段不一致，去掉约束改由应用层校验。
ALTER TABLE investment_judgments
  DROP CONSTRAINT IF EXISTS investment_judgments_stage_check;

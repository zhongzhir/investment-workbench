-- ============================================================
-- 迁移 005：修复 investment_judgments 残留约束
-- ============================================================
-- 背景：迁移 004 的列新增可能已应用，但放宽约束的语句未必生效。
--   - 旧 stage CHECK 仅允许 initial/due_diligence/decision/post_invest/exit，
--     插入 screening/investment_committee/passed/exited 会违反约束。
--   - content 原为 NOT NULL，结构化判断记录可能不带正文。
-- 幂等：可重复执行。
-- ============================================================

-- 去掉旧的 stage CHECK 约束（阶段值改由应用层校验）
ALTER TABLE investment_judgments
  DROP CONSTRAINT IF EXISTS investment_judgments_stage_check;

-- content 放宽为可空
ALTER TABLE investment_judgments
  ALTER COLUMN content DROP NOT NULL;

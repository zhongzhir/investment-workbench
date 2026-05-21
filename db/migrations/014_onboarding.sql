-- ============================================================
-- 迁移 014：新用户引导完成标记
--   users.onboarding_completed：用户首次完成引导后置 true，避免重复弹窗
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

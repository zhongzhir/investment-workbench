-- ============================================================
-- 迁移 016：用户自定义 Base URL（OpenAI 兼容 endpoint 覆写）
--   - users.ai_base_url：可选；为空时使用各服务商默认 endpoint
--   - 用途：天翼 Token / 自部署网关 等场景需要覆盖默认 URL
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS ai_base_url TEXT DEFAULT NULL;

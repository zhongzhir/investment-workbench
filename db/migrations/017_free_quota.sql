-- ============================================================
-- 迁移 017：系统免费额度（平台代付 DeepSeek）
--   - free_quota_usage：按手机号粒度跟踪 token 使用（防止多账号薅羊毛）
--   - free_quota_logs：单次调用明细，便于审计与排查
-- 幂等：可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS free_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL UNIQUE,
  tokens_used BIGINT NOT NULL DEFAULT 0,
  tokens_limit BIGINT NOT NULL DEFAULT 10000000,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS free_quota_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokens_in INT NOT NULL DEFAULT 0,
  tokens_out INT NOT NULL DEFAULT 0,
  feature VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_quota_usage_user
  ON free_quota_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_free_quota_logs_user
  ON free_quota_logs(user_id);

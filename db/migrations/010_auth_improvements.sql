-- ============================================================
-- 迁移 010：登录系统生产级加固
--   - login_attempts：登录失败限流
--   - password_reset_tokens：密码重置令牌
--   - phone_verify_codes：手机验证码
--   - users 新增 phone 字段
--   - 为支持手机号注册：放开 email 的 NOT NULL，auth_provider 允许 'phone'
-- 幂等：可重复执行。
-- ============================================================

-- 登录限流表
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier VARCHAR(255) NOT NULL,
  attempted_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
  ON login_attempts(identifier, attempted_at);

-- 密码重置令牌表
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 手机验证码表
CREATE TABLE IF NOT EXISTS phone_verify_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose VARCHAR(20) NOT NULL, -- login / register
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_phone_verify_codes_phone
  ON phone_verify_codes(phone, created_at);

-- users 表新增手机号字段
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) UNIQUE;

-- 手机号注册用户无邮箱：放开 email 的 NOT NULL 约束
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- auth_provider 放开 'phone'（原 CHECK 仅允许 credentials / github）
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_auth_provider_check;
ALTER TABLE users ADD CONSTRAINT users_auth_provider_check
  CHECK (auth_provider IN ('credentials', 'github', 'phone'));

-- ============================================================
-- 迁移 011：用户投资人画像
--   user_profiles：每个用户的投资偏好与判断标准，
--   用于在调用大模型时前置注入 system prompt。
-- 幂等：可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  focus_stages TEXT[] DEFAULT '{}',
  focus_sectors TEXT[] DEFAULT '{}',
  investment_style VARCHAR(20) DEFAULT NULL,
  check_size VARCHAR(50) DEFAULT NULL,
  typical_hold_period VARCHAR(50) DEFAULT NULL,

  self_intro TEXT DEFAULT NULL,
  decision_criteria TEXT DEFAULT NULL,
  avoid_patterns TEXT DEFAULT NULL,
  output_preference TEXT DEFAULT NULL,
  extra_context TEXT DEFAULT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

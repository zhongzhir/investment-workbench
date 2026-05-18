-- ============================================================
-- 迁移 009：投后管理 — 会议记录调整 + 投后跟踪记录表
-- ============================================================
-- 注意：meeting_notes 表已由 schema.sql 创建，且 meeting_type 的旧
--   CHECK 取值为 founder/expert/lp/post_invest/internal/other，
--   participants 为 jsonb。本迁移将 meeting_type 调整为投后管理用途
--   （regular/board/emergency/annual），并新增 ai_summary、
--   next_meeting_date。participants 保持 jsonb（存字符串数组）。
-- 幂等：可重复执行。
-- ============================================================

-- meeting_notes：调整 meeting_type 取值范围
ALTER TABLE meeting_notes
  DROP CONSTRAINT IF EXISTS meeting_notes_meeting_type_check;
ALTER TABLE meeting_notes
  ALTER COLUMN meeting_type SET DEFAULT 'regular';
ALTER TABLE meeting_notes
  ADD CONSTRAINT meeting_notes_meeting_type_check
  CHECK (meeting_type IN ('regular', 'board', 'emergency', 'annual'));

-- meeting_notes：新增字段
ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS ai_summary JSONB;
ALTER TABLE meeting_notes
  ADD COLUMN IF NOT EXISTS next_meeting_date DATE;

-- 投后跟踪记录表
CREATE TABLE IF NOT EXISTS post_investment_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  update_type VARCHAR(30) DEFAULT 'regular'
    CHECK (update_type IN ('regular', 'milestone', 'risk', 'financing', 'personnel', 'exit')),
  content TEXT NOT NULL,
  period VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_updates_project_id
  ON post_investment_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_post_updates_user_id
  ON post_investment_updates(user_id);

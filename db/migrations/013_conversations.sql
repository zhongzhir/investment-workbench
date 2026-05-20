-- ============================================================
-- 迁移 013：独立对话（standalone chat）
--   conversations：用户与 AI 的多轮对话，可关联项目，可触发认知沉淀。
-- 幂等：可重复执行。
-- ============================================================

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) DEFAULT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL DEFAULT NULL,
  -- 消息格式：[{role: 'user'|'assistant', content: string, ts: ISO string}, ...]
  messages JSONB NOT NULL DEFAULT '[]',
  summary TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_user
  ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_project
  ON conversations(project_id);

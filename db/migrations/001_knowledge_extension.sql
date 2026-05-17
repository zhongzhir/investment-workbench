-- ============================================================
-- 迁移 001：知识库 Schema 扩展
-- ============================================================
-- 在已初始化的数据库上增量应用，不触碰现有 5 张表。
--   新增：investment_judgments / meeting_notes / user_skills
--   补充：knowledge_base_entries.updated_at
-- 依赖：set_updated_at() 函数、vector 扩展（已由 schema.sql 创建）。
-- 幂等：所有语句均可重复执行（IF NOT EXISTS / OR REPLACE）。
-- ============================================================

-- ------------------------------------------------------------
-- 6. 投资判断记录表 investment_judgments
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investment_judgments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage         TEXT NOT NULL DEFAULT 'initial'
                  CHECK (stage IN (
                    'initial',
                    'due_diligence',
                    'decision',
                    'post_invest',
                    'exit'
                  )),
  judgment_type TEXT NOT NULL DEFAULT 'note'
                  CHECK (judgment_type IN (
                    'thesis',
                    'concern',
                    'assumption',
                    'decision',
                    'note'
                  )),
  title         TEXT,
  content       TEXT NOT NULL,
  outcome       TEXT,
  is_indexed    BOOLEAN NOT NULL DEFAULT false,
  embedding     VECTOR(1536),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_judgments_user    ON investment_judgments(user_id);
CREATE INDEX IF NOT EXISTS idx_judgments_project ON investment_judgments(project_id);
CREATE INDEX IF NOT EXISTS idx_judgments_stage   ON investment_judgments(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_judgments_type    ON investment_judgments(user_id, judgment_type);
CREATE INDEX IF NOT EXISTS idx_judgments_embedding ON investment_judgments
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE TRIGGER trg_judgments_updated
  BEFORE UPDATE ON investment_judgments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 7. 会议记录表 meeting_notes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  meeting_type  TEXT NOT NULL DEFAULT 'founder'
                  CHECK (meeting_type IN (
                    'founder',
                    'expert',
                    'lp',
                    'post_invest',
                    'internal',
                    'other'
                  )),
  meeting_date  DATE,
  participants  JSONB NOT NULL DEFAULT '[]'::jsonb,
  content       TEXT NOT NULL,
  key_points    JSONB NOT NULL DEFAULT '[]'::jsonb,
  action_items  JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_indexed    BOOLEAN NOT NULL DEFAULT false,
  embedding     VECTOR(1536),
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meetings_user    ON meeting_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_project ON meeting_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_type    ON meeting_notes(user_id, meeting_type);
CREATE INDEX IF NOT EXISTS idx_meetings_date    ON meeting_notes(user_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_embedding ON meeting_notes
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE TRIGGER trg_meetings_updated
  BEFORE UPDATE ON meeting_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 8. SKILL 表 user_skills
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_skills (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_name    TEXT NOT NULL,
  skill_slug    TEXT NOT NULL,
  description   TEXT,
  source_type   TEXT NOT NULL DEFAULT 'external'
                  CHECK (source_type IN (
                    'vestia',
                    'community',
                    'external'
                  )),
  source_url    TEXT,
  embed_type    TEXT NOT NULL DEFAULT 'link'
                  CHECK (embed_type IN ('link', 'embed', 'api')),
  embed_config  JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  last_used_at  TIMESTAMPTZ,
  use_count     INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, skill_slug)
);

CREATE INDEX IF NOT EXISTS idx_skills_user   ON user_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_active ON user_skills(user_id, is_active);

CREATE OR REPLACE TRIGGER trg_skills_updated
  BEFORE UPDATE ON user_skills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 9. 知识库条目补充 updated_at
-- ------------------------------------------------------------
ALTER TABLE knowledge_base_entries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE OR REPLACE TRIGGER trg_kb_updated
  BEFORE UPDATE ON knowledge_base_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

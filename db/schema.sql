-- ============================================================
-- 投资工作台 (Investment Workbench) — 核心数据库 Schema
-- PostgreSQL 15+ / pgvector
-- ============================================================
-- 设计原则：
--   1. 知识库为产品地基，所有文档与知识条目均归属单一用户（私有化）。
--   2. 嵌入向量维度默认 1536（兼容 OpenAI / 通义千问 text-embedding）。
--      若改用其他嵌入模型，需同步调整 vector(N) 维度并重建索引。
--   3. 平台不存储任何 AI 服务 API Key，故无相关表。
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- 自动维护 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------
-- 1. 用户表 users
--    一级股权投资专业人员账号。MVP 阶段仅个人版。
-- ------------------------------------------------------------
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  -- 邮箱+密码注册用户存 bcrypt 哈希；OAuth（GitHub）登录用户为 NULL
  password_hash TEXT,
  -- 注册来源：credentials（邮箱密码）/ github（OAuth）
  auth_provider TEXT NOT NULL DEFAULT 'credentials'
                  CHECK (auth_provider IN ('credentials', 'github')),
  image_url     TEXT,
  -- 版本：personal(个人版) / pro(专业版) / team(团队版)
  plan          TEXT NOT NULL DEFAULT 'personal'
                  CHECK (plan IN ('personal', 'pro', 'team')),
  -- 用户偏好的 AI 服务商（不含 Key）：deepseek / claude / qwen
  preferred_provider TEXT DEFAULT 'deepseek'
                  CHECK (preferred_provider IN ('deepseek', 'claude', 'qwen')),
  -- AI API Key（AES-256-GCM 密文，格式 iv:authTag:ciphertext）与对应服务商
  api_key_encrypted TEXT,
  ai_provider   TEXT DEFAULT 'deepseek',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 2. 项目表 projects
--    一个待评估/已投的投资标的。承载「功能2：投资分析报告生成」。
-- ------------------------------------------------------------
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,              -- 项目名称
  company_name  TEXT,                       -- 公司主体名称
  industry      TEXT,                       -- 行业
  stage         TEXT,                       -- 融资轮次：天使/Pre-A/A/B...
  -- 项目状态：评估中 / 已投 / 已 Pass / 已退出
  status        TEXT NOT NULL DEFAULT 'evaluating'
                  CHECK (status IN ('evaluating', 'invested', 'passed', 'exited')),
  -- 用户输入的判断要点（3-10 条），结构化保存为 JSON 数组
  judgment_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- AI 从 BP 提取的结构化财务数据（见 FinancialData 类型）
  financial_data JSONB,
  summary       TEXT,                       -- 项目一句话概述
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_projects_user   ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(user_id, status);

CREATE TRIGGER trg_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 3. 文档表 documents
--    用户上传的原始材料（BP / 研究报告 / 合同 等）。
--    extracted_text 为解析后的纯文本，供 AI 与切片使用。
-- ------------------------------------------------------------
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 文档可独立上传至知识库，也可挂在某个项目下
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  filename      TEXT NOT NULL,
  -- 文件格式：pdf / docx / xlsx / image
  file_type     TEXT NOT NULL
                  CHECK (file_type IN ('pdf', 'docx', 'xlsx', 'image')),
  file_url      TEXT,                       -- 对象存储路径（S3 兼容）
  file_size     BIGINT,                     -- 字节
  -- 文档类型标签：bp / research / contract / financial_model / news / other
  doc_kind      TEXT NOT NULL DEFAULT 'other'
                  CHECK (doc_kind IN ('bp', 'research', 'contract',
                                      'financial_model', 'news', 'other')),
  extracted_text TEXT,                      -- 解析出的纯文本
  -- AI 自动 + 用户手动标签（行业/阶段/类型等）
  tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 解析状态：pending / processing / done / failed
  parse_status  TEXT NOT NULL DEFAULT 'pending'
                  CHECK (parse_status IN ('pending', 'processing', 'done', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_user    ON documents(user_id);
CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_kind    ON documents(user_id, doc_kind);

CREATE TRIGGER trg_documents_updated
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 4. 知识库条目表 knowledge_base_entries
--    产品地基：文档切片 + 向量，支撑 RAG 检索增强生成。
--    每个用户的知识库完全私有、相互隔离。
-- ------------------------------------------------------------
CREATE TABLE knowledge_base_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 来源文档（切片来自哪个文档）
  source_document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  -- 关联项目（若该知识来自某项目）
  project_id    UUID REFERENCES projects(id) ON DELETE SET NULL,
  -- 条目类型：对应 PRD 知识库分类
  --   industry  行业认图
  --   project   项目库（已投/未投/Pass）
  --   thesis    投资逻辑文档
  --   prediction 预测与复盘
  --   chunk     普通文档切片
  entry_type    TEXT NOT NULL DEFAULT 'chunk'
                  CHECK (entry_type IN ('industry', 'project', 'thesis',
                                        'prediction', 'chunk')),
  title         TEXT,
  content       TEXT NOT NULL,              -- 切片/条目正文
  -- 嵌入向量。维度需与所用嵌入模型一致（默认 1536）。
  embedding     VECTOR(1536),
  -- 结构化元数据（章节、页码、来源摘要等）
  metadata      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_kb_user    ON knowledge_base_entries(user_id);
CREATE INDEX idx_kb_doc     ON knowledge_base_entries(source_document_id);
CREATE INDEX idx_kb_type    ON knowledge_base_entries(user_id, entry_type);
-- 向量近似最近邻索引（余弦距离）。数据量大后可调整 lists 参数。
CREATE INDEX idx_kb_embedding ON knowledge_base_entries
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ------------------------------------------------------------
-- 5. 报告表 reports（MVP 功能2 产物）
--    AI 生成的项目分析报告，支持多轮自然语言修改与版本留存。
-- ------------------------------------------------------------
CREATE TABLE reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '项目分析报告',
  content       TEXT NOT NULL,              -- 当前正文（Markdown）
  version       INTEGER NOT NULL DEFAULT 1, -- 多轮修改的版本号
  -- 多轮修改对话记录：[{role, content, ts}, ...]
  revision_log  JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- 多轮修改指令历史：[{instruction, ts}, ...]
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  status        TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'finalized')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reports_project ON reports(project_id);
CREATE INDEX idx_reports_user    ON reports(user_id);

CREATE TRIGGER trg_reports_updated
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

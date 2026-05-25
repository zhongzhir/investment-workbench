# AIVESTOR_CONTEXT.md
> 把这个文件粘贴到新会话的开头，Claude 即可恢复完整上下文，无需重新介绍项目。
> 最后更新：2026年5月23日（第八次更新 · 安全加固 + 免费额度改 user_id + Landing Page/GEO）

---

## 一、项目基本信息

| 字段 | 内容 |
|------|------|
| **产品名** | Aivestor |
| **品牌定位** | 以投资人为中心，AI 赋能投资人持续进化 |
| **备案域名** | aivestor.cn（备案中，已提交通信管理局，约20个工作日）|
| **临时生产地址** | https://vestia-two.vercel.app |
| **代码仓库** | https://github.com/zhongzhir/investment-workbench |
| **当前阶段** | V2.3 功能完整，全链路验证通过，内测启动中 |
| **开发模式** | Chat（Claude.ai）负责框架讨论与决策 → Claude Code 负责代码执行 |

---

## 二、产品定位

面向**一级股权投资专业人员**的 AI 增强型工作台。四个维度形成成长飞轮：

```
        当下工作（BP分析·尽调·报告）
               ↓
经验内化  →  Aivestor  ← 能力外扩
（私有知识库）   ↓   （SKILL广场）
        持续成长（认知演变·能力追踪）
```

核心价值主张：
1. 把分散的投资判断沉淀为可调用的**私有知识库**
2. AI 加速项目分析报告的**生成与打磨**
3. 结构化决策机制持续提升**个人投资判断能力**
4. 对话过程自动提炼认知，知识库越用越丰富（认知外部存储器）

**战略方向（2026-05-21确认）：**
- 以"数据主权归用户"为核心叙事对抗机构产品
- 免费+开源路线逐步推进（开源时机待产品稳定后）
- C端不期望大规模收费，通过免费+社区建立差异化

---

## 三、技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | Next.js 14（App Router）+ Tailwind CSS |
| 字体系统 | Inter（英文/数字，via next/font/google）+ 系统中文字体栈（PingFang SC / Microsoft YaHei UI），font-smoothing: auto（弃用 Noto Sans SC，其 latin subset 不含中文）|
| 后端 | Next.js API Routes |
| 数据库 | PostgreSQL（Railway）+ pgvector 扩展 |
| AI 调用 | 用户自带 API Key，支持 DeepSeek / OpenAI / Claude / 通义千问 / 智谱AI / Moonshot 等 |
| AI SDK | openai SDK（DeepSeek/OpenAI 兼容）+ @anthropic-ai/sdk |
| Embedding | 阿里云百炼 text-embedding-v4（系统统一调用，维度1536，用户无需配置）|
| 平台代付 | 系统DeepSeek Key（`SYSTEM_DEEPSEEK_API_KEY`），user_id 限额500万tokens（2026-05-23 起，原手机号限额1000万） |
| 邮件发送 | 阿里云邮件推送（DirectMail），发信地址 noreply@muhub.cn |
| 短信发送 | 阿里云短信服务（SMS），签名：北京链上文投有限公司 |
| 文件解析 | unpdf（PDF）+ mammoth（Word）+ officeparser（PPT）+ xlsx（Excel）|
| 报告生成 | 流式输出（Streaming Response）+ react-markdown + rehype-raw 渲染 |
| Word 导出 | docx 库生成 .docx |
| PPT 导出 | pptxgenjs，LAYOUT_WIDE（13.33×7.5 英寸）|
| 数据可视化 | recharts（财务图表）|
| 认证 | NextAuth.js v4（邮箱+密码 / 手机号验证码 + JWT Session）|
| 加密 | AES-256-GCM（API Key 加密存储）+ bcrypt（密码）|
| 部署 | Vercel（前端）+ Railway（PostgreSQL）|
| PWA | manifest.json + Service Worker |

---

## 四、导航结构（当前 V2.3）

| 顺序 | 入口 | 路由 | 副标题 |
|------|------|------|--------|
| 1 | 首页 | /dashboard | 概览 |
| 2 | 对话 | /chat | 与 AI 自由探讨 |
| 3 | 项目分析 | /projects | 上传 BP，生成分析报告 |
| 4 | 项目档案 | /archive | 项目全生命周期记录 |
| 5 | 知识库 | /knowledge | 私有知识沉淀与检索 |
| 6 | SKILL 广场 | /skills | 投资分析技能库 |
| 7 | 个人设置 | /settings | 个人画像与 AI 配置 |
| — | 使用说明 | /help | 右上角 ? 图标入口 |
| — | 示例项目 | /demo/consumer, /demo/saas | 无需登录可访问 |

注：认知进化（/cognition）已从导航移除，路由和数据保留，后台能力继续工作。

---

## 五、数据库 Schema（Railway PostgreSQL）

### users
```
id UUID PK | email TEXT（可为空）| name | password_hash (bcrypt)
auth_provider: credentials / github / phone
plan: free / pro / enterprise
preferred_provider | api_key_encrypted (AES-256-GCM) | ai_provider
phone VARCHAR(20) UNIQUE
onboarding_completed BOOLEAN DEFAULT FALSE
ai_base_url TEXT NULL
```

### projects
```
id UUID PK | user_id FK
name | status: active / archived
stage VARCHAR | process_stage VARCHAR | process_stage_updated_at TIMESTAMP
judgment_points JSONB
financial_data JSONB（含 extraction_quality / confidence）
outcome VARCHAR | outcome_note TEXT | outcome_at TIMESTAMP
```

### documents
```
id UUID PK | project_id FK
file_name | file_type（pdf/docx/xlsx/xls/pptx/ppt/image）| file_size
extracted_text | parse_status: pending / done / failed
```

### reports
```
id UUID PK | project_id FK
title | content (Markdown，含[src:doc/data/ai]标注和[CONFIDENCE_START/END]块)
conversation_history JSONB
version INT | status: draft / finalized（CHECK 约束仅允许这两个值）
```

### knowledge_base_entries
```
id UUID PK | user_id FK
content | embedding vector(1536)
source_type: document / report / manual
entry_type: industry/project/thesis/prediction/chunk/manual/conversation_digest/document_chunk
tags JSONB | metadata JSONB | embedding_model VARCHAR
structured_data JSONB | source_report_id UUID FK | review_status VARCHAR(10)
```

### document_chunks
```
id UUID PK | document_id FK | user_id FK
chunk_index INT | content TEXT | token_count INT
embedding vector(1536) | metadata JSONB
```

### investment_judgments
```
id UUID PK | project_id FK | user_id FK
stage VARCHAR
bull_case TEXT | bear_case TEXT | founder_assessment TEXT
key_hypothesis TEXT | confidence_level INT（1-5）
content TEXT（旧字段，现可空）
created_at | updated_at
```

### user_profiles
```
id UUID PK | user_id UUID UNIQUE FK
focus_stages TEXT[] | focus_sectors TEXT[]
investment_style VARCHAR(20)
check_size VARCHAR(50) | typical_hold_period VARCHAR(50)
self_intro TEXT | decision_criteria TEXT
avoid_patterns TEXT | output_preference TEXT | extra_context TEXT
created_at | updated_at
```

### conversations
```
id UUID PK | user_id FK
title VARCHAR(200)
project_id UUID FK（可选关联项目）
messages JSONB（[{role, content, ts}]）
summary TEXT | created_at | updated_at
```

### user_custom_skills
```
（原有字段）+ metadata JSONB DEFAULT '{}'
metadata用途：{ imported: true } / { generated_from_judgments: true } / { generated_at }
```

### free_quota_usage
```
id UUID PK | user_id FK UNIQUE | phone VARCHAR(20) NULL（历史兼容，已弃用为键）
tokens_used BIGINT DEFAULT 0 | tokens_limit BIGINT DEFAULT 5000000
created_at | updated_at
（2026-05-23 起以 user_id 为唯一键，邮箱用户无需绑定手机号即可用免费额度）
```

### free_quota_logs
```
id UUID PK | user_id FK
tokens_in INT | tokens_out INT | feature VARCHAR(50)
created_at
```

### login_attempts / password_reset_tokens / phone_verify_codes
### meeting_notes / user_skills / post_investment_updates
（已建表）

---

## 六、品牌设计规范

### Logo 字形
- `Ai` 部分：font-light | `vestor` 部分：font-bold
- 含义：investor 是主体，ai 是赋能前缀，读音重心在 vestor

### 品牌色板
| 色值 | 名称 | 用途 |
|------|------|------|
| `#0D1B3E` | 深海蓝 | 主背景色，PPT 主题色 |
| `#1B6FE8` | 科技蓝 | 浅色背景主线条，主要交互色 |
| `#4A9EFF` | 亮蓝 | 深色背景，发光效果 |
| `#FF6B35` | 活力橙 | 辅色，accent，PPT 强调色 |
| `#3d7a5e` | 低饱和绿 | 界面 accent，按钮，导航高亮 |
| `#1a1a1a` | 墨黑 | 正文主色 |
| `#666666` | 中灰 | 次要文字 |

---

## 七、已完成功能

### V1.0（2026-05-16）
用户认证、API Key管理、BP上传解析、AI报告生成（流式，七章节）、多轮修改、财务分析、Word导出、PWA

### V1.1（2026-05-17）
PPT导出、知识库Schema、文件上传修复、知识库前端界面、首页优化

### V2（2026-05-18）
知识库Chunking+向量检索、认知进化模块、投资决策中心（魔鬼代言人/行业外视角/历史镜像）、多文件上传、SKILL广场（20官方+自建）、认知进化深度功能、投后管理

### V2 后期（2026-05-19）
向量检索接入百炼、财务提取质量提升、Excel直读、报告注入财务数据、登录限流、忘记密码、手机号登录

### V2.1（2026-05-20 上午）
品牌更名（Vestia→Aivestor）、用户自我设定、对话沉淀、字体/UI美化、独立对话模式、细节修复

### V2.2（2026-05-20 下午）
导航重构、项目档案页、知识库认知模式分析、使用说明页、/dashboard路由

### V2.3（2026-05-21）
| 模块 | commit |
|------|--------|
| P0#3 新用户冷启动（Onboarding弹窗+示例项目）| 6f2c64c |
| P0#4 报告数据溯源标注（[src:doc/data/ai]徽章）| 7bc438e |
| P0#5 跨会话持久记忆（动态注入+SAVE_PREF+自动Digest）| 74a6a0e |
| P1#6 SKILL系统深化（导出/导入/AI辅助/从判断生成）| 2d944ed |
| P1#7 降低API Key门槛（运营商引导+UX优化+测试连接）| 44b71ac |
| P1#8 报告置信度展示（五维度ConfidencePanel）| 648852a |
| P1#10 主动提醒机制（沉睡项目+遗留疑问）| c8fc314 |
| 体验修复4项（推荐方案/链接/Onboarding条件/示例项目）| 4198520 |
| 帮助页联系方式 + 平台代付免费额度 | afb0575 |
| 客户端/服务端bundle隔离修复（tls模块）| ed044c2 |
| DigestCard+digest API全链路错误处理 | 3a8f12d |
| append-pref UPSERT修复+前端错误反馈 | 2f90f68 |
| 字体渲染加重（body/p/li weight 500，标题 700-800）+ DigestCard 对齐修复 + 配色克制化 | — |
---
### V2.4（2026-05-22）
| 模块 | 说明 |
|------|------|
| 字体系统重构 | 移除无效的 Noto_Sans_SC（latin subset 不含中文），改用系统字体栈（PingFang SC / Microsoft YaHei UI），font-smoothing 改 auto，解决合成加粗发毛问题 |
| 知识库静默化 | digest 阈值调至10轮，移除主动确认卡片，改为2秒消失 toast；输入框旁加书签图标，支持主动查看/编辑待沉淀内容 |
| SKILL 分析归档 | 关联项目的 SKILL 分析结果写入 reports 表（而非知识库），在项目档案「分析报告」Tab 展示，带紫色「SKILL 分析」角标 |
| 投委会总报告 | 档案页勾选多份分析 → 合并生成投委会格式总报告（七章节固定结构）→ 流式生成 → 橙色「总报告」角标，支持 Word/PPT 导出 |
| DigestCard 对齐修复 | 移入消息滚动容器，消除滚动条宽度导致的右边缘错位 |
| 报告「查看」按钮修复 | 报告页支持 /projects/[id]/report?reportId=xxx，按 reportId 打开指定报告（无参数回退最新，向后兼容）；档案页「查看」传入对应 report.id |

### V2.5（2026-05-23）上线前安全加固
| 模块 | 说明 |
|------|------|
| 上下文清理 | 移除 AIVESTOR_CONTEXT.md 中硬编码的测试账号明文密码 |
| 文件上传校验 | `/api/upload-url` 增加服务端大小(4MB)/扩展名/MIME 三重校验（前端 FileUploader、projects/new 已有客户端校验） |
| 密码重置 Token | 过期时间 1 小时 → 15 分钟；发起新请求时作废该账号此前未使用的旧 Token（仅最新链接有效） |
| XSS 防护 | ReportView 报告渲染在 rehype-raw 后追加 rehype-sanitize，自定义 schema 放行溯源徽章 `<span class>` |
| HTTP 安全响应头 | next.config.mjs 增加 X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy，及 /api CORS 头 |
| 复核确认 | AES-256-GCM（IV 每次随机+拼接存储）、资源端点 user_id 归属校验、短信验证码限流、SQL 全参数化——审计后均为原本正确 |

### V2.6（2026-05-23）免费额度改 user_id 限额
| 模块 | 说明 |
|------|------|
| 限额维度 | `free_quota_usage` 唯一键 phone → user_id（迁移 018）；邮箱注册用户无需绑定手机号即可使用免费额度 |
| 服务层 | freeQuota.ts：getFreeQuotaStatus / consumeQuota 改以 user_id 查询与 UPSERT，移除"必须有手机号"判断 |
| 调用链 | report.ts freeQuotaMetaFor、ai.ts streamChat freeQuotaMeta、autoDigest、chat 标题生成均去除 phone 字段 |
| API | /api/user/quota-status 移除 no_phone 分支与 phone 返回字段（响应仍含 tokensUsed/tokensLimit/tokensRemaining） |
| 额度调整 | 默认额度 1000 万 → 500 万（代码 QUOTA_LIMIT_DEFAULT + .env.example + 迁移列默认值；Vercel FREE_QUOTA_TOKENS 需同步改 5000000） |
| 文案 | 额度耗尽提示改为「免费额度已用完，配置自己的 API Key 后可无限使用，数据完全归您所有。前往设置 →」（链接 /settings） |

### V2.7（2026-05-23）Landing Page + GEO/SEO 结构化数据
| 模块 | 说明 |
|------|------|
| 落地页 | 新增 `src/components/LandingPage.tsx`（Hero/痛点/功能/对比/FAQ/CTA），未登录访问 `/` 展示，已登录仍 redirect `/dashboard`（`(app)/page.tsx` 用 getServerSession 判断） |
| 结构化数据 | LandingPage 内注入 Schema.org JSON-LD（SoftwareApplication，含 offers/audience/creator/featureList） |
| Metadata | 根 layout 补充 title.template、keywords、openGraph（保留 manifest/appleWebApp） |
| 无壳落地页 | `(app)/layout.tsx` 改为 async server component，按 getServerSession 判断：无 session 仅渲染 `{children}`（落地页/`/help`/`/demo` 公开访客无 Sidebar/TopBar），有 session 保持原侧栏+顶栏。受保护页面必有 session，行为不变 |

### V2.8（2026-05-25）数据导出与迁移
| 模块 | 说明 |
|------|------|
| 设置页新增 section | `/settings` 新增「数据导出与迁移」区块，三种导出格式；组件 `src/components/settings/DataExport.tsx` |
| 投资人 System Prompt | `POST /api/export/system-prompt`：聚合 user_profiles + 知识库精选（entry_type thesis/industry/prediction/manual 或 source_type=manual，取最近50条）+ user_custom_skills，调 AI 压缩为 2000 字内结构化 system prompt，前端文本框展示 + 一键复制 |
| 知识库快照 | `GET /api/export/knowledge-snapshot`：全部 knowledge_base_entries 按分组渲染 Markdown，下载 `aivestor-knowledge-{date}.md`（手动笔记单列一组，其余按 entry_type） |
| 完整投资档案 | `GET /api/export/full-archive`：聚合 profile + 自建 SKILL + 全部知识库 + 项目及其投资判断（用 bull_case/bear_case/founder_assessment/key_hypothesis/confidence_level 字段，与 judgments 路由一致），docx 下载 `aivestor-archive-{date}.docx` |
| 共享工具 | `src/lib/export.ts`：EXPORT_FOOTER 署名行、知识库 Markdown 分组格式化、日期工具；所有导出产物末尾统一附「本档案由 Aivestor 生成 · aivestor.cn · 你的判断，永远属于你」 |

## 八、数据库迁移记录

| 文件 | 内容 | 状态 |
|------|------|------|
| 001-009 | 基础表结构 | ✅ |
| 010_auth_improvements.sql | 登录限流/密码重置/手机验证 | ✅ |
| 011_user_profile.sql | user_profiles 表 | ✅ |
| 012_conversation_digest.sql | knowledge_base_entries 新增字段+CHECK约束 | ✅ |
| 013_conversations.sql | conversations 表 | ✅ |
| 014_onboarding.sql | users.onboarding_completed | ✅ |
| 015_user_skill_metadata.sql | user_custom_skills.metadata | ✅ |
| 016_user_ai_base_url.sql | users.ai_base_url | ✅ |
| 017_free_quota.sql | free_quota_usage + free_quota_logs | ✅ |
| 018_free_quota_by_userid.sql | 免费额度唯一键 phone→user_id、phone 改可空、默认额度 5M | ⏳ 待 Railway 执行 |

---

## 九、待办事项

### 阻断性问题
1. **域名切换**：aivestor.cn 备案完成（约20个工作日）后，更新 NEXTAUTH_URL 并绑定 Vercel
2. **大文件支持**：Vercel 4MB 限制，需迁移阿里云 OSS（同时解决原始文件保留问题）

### 近期待处理（非开发）
3. **内测启动**：通过 vestia-two.vercel.app 邀请种子用户，收集真实反馈
4. **免费额度与手机号绑定**：邮箱注册用户需绑定手机号才能使用免费额度，待决定是否做"引导绑定手机号"功能（方向A）或改为账号ID限额（方向B）
5. **过渡域名**：考虑注册 aivestor.com 绑定 Vercel，备案期间使用（备选）
### 近期待处理（新增）
6. **备案通过后迁移阿里云轻量服务器**：需处理 Next.js 在 Linux 上的 PM2/standalone 部署、Railway PostgreSQL 外网连接保留（或迁移到阿里云 RDS）、NEXTAUTH_URL 切换到 aivestor.cn

### 未决设计决策
- **免费额度对邮箱用户的处理**：方向A（引导绑定手机号）vs 方向B（用uid替代phone，防滥用弱）
- **邀请说明文档**：已生成 Aivestor_邀请说明.md + Aivestor_邀请海报.html，需根据免费额度决策更新措辞

### P2 — 长期规划（全部推后）
11. 行业知识公共层（接入公开研报数据）
12. 原生App（iOS优先，PWA体验受限）
13. 决策辅助第二层（历史判断盲区识别，需数据积累）
14. 决策辅助第三层（outcome回溯反馈闭环，需数据积累）
15. 本地化部署版（Docker Compose + Ollama，数据主权终极承诺）
16. 机构版（多人协作、机构知识库）
17. 历史文件批量导入（待OSS问题解决后）
18. 计费系统（embedding等系统服务用量计费）

### 移出待办
- ~~P1#9 跨项目财务对比~~（移至辅助决策功能时再考虑）

---

## 十、关键踩坑记录

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| investment_judgments INSERT 失败 | 旧 CHECK 约束未删除 | 005 迁移删除旧约束 |
| document_chunks embedding 全 null | DeepSeek 无 embedding API | 接入阿里云百炼 ✅ |
| fire-and-forget chunking 风险 | Vercel serverless 冻结 | 改为 await |
| PPT/Excel 上传入库失败 | file_type CHECK 约束未扩展 | 006 迁移扩展约束 |
| Claude Code 虚报完成 | 在独立 worktree 工作未 commit | 让 Claude Code 自行合并推送 main |
| 阿里云邮件 API 404 | POST 方式错误，需用 GET | 改为 GET，参数放 query string |
| 阿里云邮件 API 400 | Version 参数错误 | 改为正确版本号 2015-11-23 |
| entry_type CHECK 约束冲突 | 012 迁移新增值与旧约束冲突 | DROP + 重建并集约束 |
| conversation_history 格式不一致 | reports 表实际为 [{instruction,ts}] | formatHistory 兼容两种结构 |
| Noto_Sans_SC subsets 类型报错 | TS 不暴露 chinese-simplified | 保留 latin，运行时自动切片 |
| Railway Query 面板表不存在不报错 | 面板显示"no rows"而非错误 | 用 Vercel 日志确认真实错误 |
| 对话模式「+新对话」无响应 | conversations 表未建，500 被静默吞 | 加 try/catch 浮出错误 + 执行迁移 |
| lucide-react HelpCircle 未安装 | 项目未引入 lucide-react | 改用内联 SVG |
| PowerShell 5.1 批量编辑中文乱码 | Set-Content 以系统GBK编码写出 | git checkout 还原，改用 Edit 工具逐处修改 |
| PowerShell [id] 路径被当glob | [] 被解释为通配符 | Edit 工具基于绝对路径不受影响 |
| Vercel build失败 tls模块找不到 | freeQuota.ts被客户端组件直接import，pg依赖tls | 抽取formatTokens到独立客户端安全文件 |
| DigestCard「Unexpected end of JSON」| res.json()在res.ok检查前执行 | 先检查ok再解析，加结构化错误返回 |
| append-pref点击无反应 | 客户端静默吞错误，服务端返回笼统500 | UPSERT替代SELECT+INSERT，前端显示错误 |
| 知识沉淀报错「知识库表/列缺失」| 迁移011/012未在Railway执行 | Railway手动执行迁移文件 |
| 中文字体偏细 | font-weight 默认 400，中文屏幕渲染偏细 | globals.css 全局设为 500，标题 700-800 |
| DigestCard 对不齐 | 卡片容器未与 AI 气泡共享同一 max-w-3xl 父层 | ChatArea.tsx 对齐外层 px-6 + 内层 max-w-3xl |
| DigestCard 色彩突兀 | 深蓝背景+橙色按钮过于抢眼 | 改为 border-blue-200/bg-blue-50 柔和卡片风格 |
---

## 十一、竞品参考

### AlphaEngine / AlphaClaw（熵简科技）
- **官网**：www.alphaengine.top
- **定位**：面向二级市场机构投资者的 AI 投研平台
- **用户规模**：7000+家资管机构，6-7万名基金经理/分析师
- **核心护城河**：海量公开投研数据库（日更近万篇研报/会议纪要）+ 平台代付（无需API Key）
- **与 Aivestor 的关系**：用户群不同（二级 vs 一级），但产品理念高度相似
- **AlphaClaw"零门槛"的本质**：平台自己承担模型费用，不是技术方案，是商业模式
- **对 Aivestor 的启发**：数据溯源标注、Skill深度个性化、Local-First架构、跨会话记忆

---

## 十二、关键凭证（勿泄露）

| 资源 | 位置 |
|------|------|
| DATABASE_URL | Vercel 环境变量（Railway 外网连接串）|
| NEXTAUTH_SECRET | Vercel 环境变量 |
| BAILIAN_API_KEY | Vercel 环境变量（阿里云百炼 embedding）|
| ALIYUN_ACCESS_KEY_ID / SECRET | Vercel 环境变量（邮件+短信）|
| ALIYUN_EMAIL_FROM | noreply@muhub.cn |
| ALIYUN_SMS_SIGN | 北京链上文投有限公司 |
| ALIYUN_SMS_TEMPLATE | SMS_505110109 |
| SYSTEM_DEEPSEEK_API_KEY | Vercel 环境变量（平台代付，已设置）|
| FREE_QUOTA_TOKENS | Vercel 环境变量（默认5000000，建议设为5000000）|
| 测试账号 | 见内部安全文档，禁止在此记录 |
| 联系邮箱 | Aivestor@qq.com |

---

*本文件最后由 Claude 在 2026-05-21 会话中更新（V2.3，第五次）。*
*下次会话开始时粘贴此文件即可继续工作，无需重新介绍背景。*

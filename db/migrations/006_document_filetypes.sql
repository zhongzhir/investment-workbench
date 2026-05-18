-- ============================================================
-- 迁移 006：documents.file_type 支持 PPT / 旧版 Excel
-- ============================================================
-- 原 CHECK 仅允许 pdf/docx/xlsx/image，统一上传新增 pptx、xls，
-- 需放宽约束否则插入会违反 CHECK。
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_file_type_check;

ALTER TABLE documents
  ADD CONSTRAINT documents_file_type_check
  CHECK (file_type IN ('pdf', 'docx', 'pptx', 'xlsx', 'xls', 'image'));

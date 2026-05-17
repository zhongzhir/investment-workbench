// 将指定的 SQL 迁移文件应用到 DATABASE_URL 指向的数据库。
// 用法：node --env-file=.env.local scripts/apply-migration.mjs db/migrations/001_knowledge_extension.sql
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("✗ 用法：node scripts/apply-migration.mjs <迁移文件路径>");
  process.exit(1);
}

let sql;
try {
  sql = readFileSync(resolve(file), "utf8");
} catch {
  console.error(`✗ 无法读取迁移文件：${file}`);
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ 未设置 DATABASE_URL 环境变量");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query(sql);
  console.log(`✓ 迁移已应用：${file}`);
} catch (err) {
  console.error("✗ 迁移应用失败：", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

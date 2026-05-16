// 将 db/schema.sql 应用到 DATABASE_URL 指向的数据库。
// 用法：node scripts/apply-schema.mjs   (需先设置 DATABASE_URL 环境变量)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✗ 未设置 DATABASE_URL 环境变量");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query(sql);
  console.log("✓ 数据库 Schema 应用成功");
} catch (err) {
  console.error("✗ Schema 应用失败：", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { isValidSkillCategory, SKILL_STAGES } from "@/lib/skills";

interface CustomSkillRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  prompt_template: string;
  applicable_stages: string[];
  created_at: string;
  updated_at: string;
}

function normalizeStages(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter(
    (s): s is string =>
      typeof s === "string" && (SKILL_STAGES as readonly string[]).includes(s)
  );
}

// 兼容两种入参：
// 1) Aivestor 导出格式：{ aivestor_skill_version, skill: { name, description, prompt, category, applicable_stages? } }
// 2) 通用格式：{ name, description, prompt, category? }
function unpackImport(body: unknown): {
  name?: string;
  description?: string;
  category?: string;
  prompt?: string;
  applicable_stages?: unknown;
  aivestor?: boolean;
} | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  if (b.aivestor_skill_version && b.skill && typeof b.skill === "object") {
    const s = b.skill as Record<string, unknown>;
    return {
      name: typeof s.name === "string" ? s.name : undefined,
      description: typeof s.description === "string" ? s.description : undefined,
      category: typeof s.category === "string" ? s.category : undefined,
      prompt: typeof s.prompt === "string" ? s.prompt : undefined,
      applicable_stages: s.applicable_stages,
      aivestor: true,
    };
  }

  // 通用格式
  return {
    name: typeof b.name === "string" ? b.name : undefined,
    description: typeof b.description === "string" ? b.description : undefined,
    category: typeof b.category === "string" ? b.category : undefined,
    prompt: typeof b.prompt === "string" ? b.prompt : undefined,
    applicable_stages: b.applicable_stages,
    aivestor: false,
  };
}

// POST /api/skills/import — 导入一个外部 SKILL
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "请求格式错误" }, { status: 400 });
    }

    const unpacked = unpackImport(body);
    if (!unpacked) {
      return NextResponse.json(
        { error: "JSON 内容无法识别" },
        { status: 422 }
      );
    }

    const name = unpacked.name?.trim();
    const prompt = unpacked.prompt?.trim();
    if (!name) {
      return NextResponse.json(
        { error: "缺少 name 字段" },
        { status: 422 }
      );
    }
    if (!prompt) {
      return NextResponse.json(
        { error: "缺少 prompt 字段" },
        { status: 422 }
      );
    }

    // category：合法则用，否则置 null（自建 SKILL 允许 null）
    const category =
      unpacked.category && isValidSkillCategory(unpacked.category)
        ? unpacked.category
        : null;

    const metadata = {
      imported: true,
      imported_at: new Date().toISOString(),
      format: unpacked.aivestor ? "aivestor" : "generic",
    };

    const rows = await query<CustomSkillRow>(
      `INSERT INTO user_custom_skills
         (user_id, name, description, category, prompt_template,
          applicable_stages, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, description, category, prompt_template,
                 applicable_stages, created_at, updated_at`,
      [
        session.user.id,
        name.slice(0, 100),
        unpacked.description?.trim()?.slice(0, 1000) || null,
        category,
        prompt,
        normalizeStages(unpacked.applicable_stages),
        JSON.stringify(metadata),
      ]
    );

    return NextResponse.json({ skill: rows[0] }, { status: 201 });
  } catch (e) {
    console.error("[skills/import] 失败:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "导入失败" },
      { status: 500 }
    );
  }
}

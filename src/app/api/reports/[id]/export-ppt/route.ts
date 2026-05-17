import { NextResponse } from "next/server";
import pptxgen from "pptxgenjs";
import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

// 品牌色
const NAVY = "0D1B3E";
const ORANGE = "FF6B35";
const WHITE = "FFFFFF";
const INK = "1F2937";
const INK_SOFT = "4B5563";
const CARD_BG = "F4F5F7";

interface Section {
  title: string;
  bullets: string[];
  paragraphs: string[];
}

// 去除行内 **加粗** 标记
function stripInline(text: string): string {
  return text.replace(/\*\*/g, "").trim();
}

// 将 Markdown 报告按 ## 标题切分为章节
function parseSections(markdown: string): Section[] {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("## ")) {
      current = { title: stripInline(line.slice(3)), bullets: [], paragraphs: [] };
      sections.push(current);
      continue;
    }
    if (line.startsWith("# ")) continue; // 顶级标题忽略，封面已展示项目名

    if (!current) {
      current = { title: "概述", bullets: [], paragraphs: [] };
      sections.push(current);
    }

    if (/^[-*]\s+/.test(line)) {
      current.bullets.push(stripInline(line.replace(/^[-*]\s+/, "")));
    } else if (line.startsWith("### ")) {
      current.paragraphs.push(stripInline(line.slice(4)));
    } else {
      current.paragraphs.push(stripInline(line));
    }
  }
  return sections;
}

// GET /api/reports/[id]/export-ppt — 导出投委会 PPT
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const rows = await query<{
    title: string;
    content: string;
    project_name: string;
    industry: string;
    stage: string;
  }>(
    `SELECT r.title, r.content, p.name AS project_name, p.industry, p.stage
     FROM reports r JOIN projects p ON p.id = r.project_id
     WHERE r.id = $1 AND r.user_id = $2`,
    [params.id, session.user.id]
  );
  if (rows.length === 0) {
    return NextResponse.json({ error: "报告不存在" }, { status: 404 });
  }
  const report = rows[0];
  const sections = parseSections(report.content);

  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 英寸
  pptx.author = "Vestia 投资工作台";

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // —— 封面页 ——
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  cover.addText("VESTIA", {
    x: 0.7,
    y: 0.5,
    w: 4,
    h: 0.5,
    fontSize: 16,
    bold: true,
    color: ORANGE,
    charSpacing: 3,
  });
  cover.addText(report.project_name, {
    x: 0.7,
    y: 2.6,
    w: 11.9,
    h: 1.6,
    fontSize: 48,
    bold: true,
    color: WHITE,
  });
  cover.addText(
    `${report.industry}  ·  ${report.stage}`,
    {
      x: 0.7,
      y: 4.3,
      w: 11.9,
      h: 0.6,
      fontSize: 22,
      color: ORANGE,
    }
  );
  cover.addText(report.title, {
    x: 0.7,
    y: 5.0,
    w: 11.9,
    h: 0.5,
    fontSize: 16,
    color: "AAB2C5",
  });
  cover.addText(`投资委员会评审  |  ${today}`, {
    x: 0.7,
    y: 6.6,
    w: 11.9,
    h: 0.4,
    fontSize: 13,
    color: "AAB2C5",
  });

  // —— 目录页 ——
  const toc = pptx.addSlide();
  toc.background = { color: WHITE };
  toc.addText("目录", {
    x: 0.7,
    y: 0.6,
    w: 11.9,
    h: 0.8,
    fontSize: 30,
    bold: true,
    color: NAVY,
  });
  toc.addShape(pptx.ShapeType.line, {
    x: 0.7,
    y: 1.5,
    w: 1.2,
    h: 0,
    line: { color: ORANGE, width: 3 },
  });
  sections.forEach((s, i) => {
    const rowY = 1.95 + i * 0.7;
    if (rowY > 7) return; // 超出页面则不再列出
    toc.addShape(pptx.ShapeType.ellipse, {
      x: 0.7,
      y: rowY,
      w: 0.5,
      h: 0.5,
      fill: { color: NAVY },
    });
    toc.addText(String(i + 1), {
      x: 0.7,
      y: rowY,
      w: 0.5,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: WHITE,
      align: "center",
      valign: "middle",
    });
    toc.addText(s.title, {
      x: 1.45,
      y: rowY,
      w: 10.8,
      h: 0.5,
      fontSize: 18,
      color: INK,
      valign: "middle",
    });
  });

  // —— 内容页 ——
  const CARDS_PER_SLIDE = 6;

  function addContentSlide(
    section: Section,
    index: number,
    bulletPage: string[],
    paragraphs: string[],
    pageSuffix: string
  ) {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };

    slide.addText(`${String(index + 1).padStart(2, "0")}`, {
      x: 0.7,
      y: 0.45,
      w: 1.5,
      h: 0.5,
      fontSize: 18,
      bold: true,
      color: ORANGE,
    });
    slide.addText(section.title + pageSuffix, {
      x: 0.7,
      y: 0.8,
      w: 11.9,
      h: 0.8,
      fontSize: 26,
      bold: true,
      color: NAVY,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: 0.7,
      y: 1.65,
      w: 11.9,
      h: 0,
      line: { color: "E5E7EB", width: 1 },
    });

    let cursorY = 1.9;

    // 正文段落直接排版
    if (paragraphs.length > 0) {
      slide.addText(
        paragraphs.map((p) => ({ text: p, options: { breakLine: true } })),
        {
          x: 0.7,
          y: cursorY,
          w: 11.9,
          h: 1.6,
          fontSize: 14,
          color: INK_SOFT,
          lineSpacingMultiple: 1.3,
          valign: "top",
        }
      );
      cursorY += 1.8;
    }

    // 要点转卡片网格（两列）
    const cardW = 5.78;
    const cardH = 1.4;
    const gapX = 0.34;
    const gapY = 0.3;
    bulletPage.forEach((b, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cx = 0.7 + col * (cardW + gapX);
      const cy = cursorY + row * (cardH + gapY);
      slide.addShape(pptx.ShapeType.roundRect, {
        x: cx,
        y: cy,
        w: cardW,
        h: cardH,
        fill: { color: CARD_BG },
        line: { color: "E5E7EB", width: 1 },
        rectRadius: 0.08,
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: cx,
        y: cy,
        w: 0.09,
        h: cardH,
        fill: { color: ORANGE },
      });
      slide.addText(b, {
        x: cx + 0.28,
        y: cy,
        w: cardW - 0.5,
        h: cardH,
        fontSize: 13,
        color: INK,
        valign: "middle",
        lineSpacingMultiple: 1.2,
      });
    });
  }

  sections.forEach((section, index) => {
    const bullets = section.bullets;
    if (bullets.length <= CARDS_PER_SLIDE) {
      addContentSlide(section, index, bullets, section.paragraphs, "");
    } else {
      // 卡片过多时分页
      for (let p = 0; p * CARDS_PER_SLIDE < bullets.length; p++) {
        const page = bullets.slice(
          p * CARDS_PER_SLIDE,
          (p + 1) * CARDS_PER_SLIDE
        );
        addContentSlide(
          section,
          index,
          page,
          p === 0 ? section.paragraphs : [],
          p === 0 ? "" : `（续 ${p + 1}）`
        );
      }
    }
  });

  // —— 结尾页 ——
  const end = pptx.addSlide();
  end.background = { color: NAVY };
  end.addText("感谢审阅", {
    x: 0.7,
    y: 3.0,
    w: 11.9,
    h: 1.2,
    fontSize: 44,
    bold: true,
    color: WHITE,
    align: "center",
  });
  end.addText("VESTIA  投资工作台", {
    x: 0.7,
    y: 4.3,
    w: 11.9,
    h: 0.5,
    fontSize: 15,
    color: ORANGE,
    align: "center",
    charSpacing: 2,
  });

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  const filename = encodeURIComponent(`${report.project_name}-投委会.pptx`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
    },
  });
}

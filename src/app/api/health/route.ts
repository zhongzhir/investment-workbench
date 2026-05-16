import { NextResponse } from "next/server";

// 健康检查端点，用于部署探活与确认 API Routes 可用。
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "investment-workbench",
    time: new Date().toISOString(),
  });
}

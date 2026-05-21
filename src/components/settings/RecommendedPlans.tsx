"use client";

import { useState } from "react";

interface Props {
  defaultExpanded: boolean;
}

interface Plan {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  detail: string[];
  steps: string[];
}

const PLANS: Plan[] = [
  {
    key: "ctyun",
    icon: "🔵",
    title: "中国电信 · 天翼 Token 套餐",
    subtitle: "个人版 9.9 元 / 月 · 1000 万 Tokens",
    detail: [
      "支持 DeepSeek V3、GLM 等主流模型",
      "手机号实名 · 话费支付 · OpenAI 协议兼容",
    ],
    steps: [
      "访问天翼云 Token 服务页面：https://www.ctyun.cn/document/11061839/11092415",
      "用手机号实名注册，选择「个人版 9.9 元 / 月」，话费支付",
      "在控制台获取 API Key，填入下方配置框；Base URL 填写：https://api.ctyun.cn/v1（请以官方文档为准）",
    ],
  },
  {
    key: "deepseek",
    icon: "🟣",
    title: "DeepSeek 官方",
    subtitle: "按量计费 · 新用户赠送 10 元额度",
    detail: ["R1 / V3 模型 · 直接申请"],
    steps: [
      "访问 https://platform.deepseek.com，注册账号",
      "进入「API Keys」页面，点击「创建 API Key」",
      "复制 Key，填入下方配置框，Provider 选择「DeepSeek」",
    ],
  },
];

export function RecommendedPlans({ defaultExpanded }: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-medium text-slate-800">
          ⚡ 推荐入门方案
        </span>
        <span className="text-xs text-slate-400">
          {open ? "收起 ∧" : "展开 ∨"}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 pt-3">
          <p className="text-xs text-slate-500">
            还没有 API Key？以下方案门槛低、价格实惠：
          </p>
          <div className="mt-3 space-y-3">
            {PLANS.map((p) => (
              <div
                key={p.key}
                className="rounded-lg border border-slate-200 bg-slate-50/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {p.icon} {p.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.subtitle}
                    </p>
                    <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
                      {p.detail.map((d, i) => (
                        <li key={i}>· {d}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenTutorial((cur) => (cur === p.key ? null : p.key))
                    }
                    className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
                  >
                    {openTutorial === p.key ? "收起教程" : "查看申请教程"}
                  </button>
                </div>

                {openTutorial === p.key && (
                  <ol className="mt-3 list-decimal space-y-1.5 rounded border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600">
                    {p.steps.map((step, i) => {
                      // 把行内 URL 显示为可点击链接
                      const parts = step.split(/(https?:\/\/[^\s]+)/g);
                      return (
                        <li key={i} className="pl-1">
                          {parts.map((part, j) =>
                            /^https?:\/\//.test(part) ? (
                              <a
                                key={j}
                                href={part}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 hover:underline break-all"
                              >
                                {part}
                              </a>
                            ) : (
                              <span key={j}>{part}</span>
                            )
                          )}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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
  // 教程步骤：可包含一段链接，渲染时分离 a 标签与文本
  steps: Array<
    | string
    | { text: string; link?: { href: string; label: string }; suffix?: string }
  >;
}

const PRIMARY_PLANS: Plan[] = [
  {
    key: "deepseek",
    icon: "🟣",
    title: "DeepSeek 官方",
    subtitle: "按量计费 · 新用户赠送 10 元额度",
    detail: ["R1 / V3 模型 · 直接申请"],
    steps: [
      {
        text: "访问 ",
        link: { href: "https://platform.deepseek.com", label: "platform.deepseek.com" },
        suffix: "，注册账号",
      },
      "进入「API Keys」页面，点击「创建 API Key」",
      "复制 Key，填入下方配置框，Provider 选择「DeepSeek」",
    ],
  },
  {
    key: "zhipu",
    icon: "🟢",
    title: "智谱 AI（GLM）",
    subtitle: "按量计费 · 新用户赠送资源包",
    detail: ["GLM-4 系列 · OpenAI 协议兼容"],
    steps: [
      {
        text: "访问 ",
        link: { href: "https://open.bigmodel.cn", label: "open.bigmodel.cn" },
        suffix: "，手机号注册",
      },
      "在控制台「API Keys」中创建 Key",
      "Provider 选择「智谱 AI」，Base URL 自动填入 https://open.bigmodel.cn/api/paas/v4",
    ],
  },
  {
    key: "moonshot",
    icon: "🔵",
    title: "Moonshot（Kimi）",
    subtitle: "按量计费 · 新用户赠送额度",
    detail: ["Kimi-latest · OpenAI 协议兼容"],
    steps: [
      {
        text: "访问 ",
        link: { href: "https://platform.moonshot.cn", label: "platform.moonshot.cn" },
        suffix: "，注册账号",
      },
      "在控制台「API Key 管理」中创建 Key",
      "Provider 选择「Moonshot」，Base URL 自动填入 https://api.moonshot.cn/v1",
    ],
  },
];

const MORE_PLANS: Plan[] = [
  {
    key: "ctyun",
    icon: "📡",
    title: "中国电信 · 天翼 Token 套餐",
    subtitle: "个人版 9.9 元 / 月 · 1000 万 Tokens",
    detail: [
      "支持 DeepSeek V3、GLM 等主流模型",
      "手机号实名 · 话费支付 · OpenAI 协议兼容",
    ],
    steps: [
      {
        text: "访问 ",
        link: {
          href: "https://www.ctyun.cn/document/11061839/11092415",
          label: "天翼云 Token 服务文档",
        },
        suffix: "",
      },
      "用手机号实名注册，选择「个人版 9.9 元 / 月」，话费支付",
      "在控制台获取 API Key，填入下方配置框；Base URL 填写 https://api.ctyun.cn/v1（请以官方文档为准）",
    ],
  },
];

export function RecommendedPlans({ defaultExpanded }: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

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
            还没有 API Key？以下主推方案门槛低、价格实惠：
          </p>
          <div className="mt-3 space-y-3">
            {PRIMARY_PLANS.map((p) => (
              <PlanCard
                key={p.key}
                plan={p}
                isOpen={openTutorial === p.key}
                onToggle={() =>
                  setOpenTutorial((cur) => (cur === p.key ? null : p.key))
                }
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="mt-4 text-xs text-blue-700 hover:underline"
          >
            {showMore ? "收起更多方案 ∧" : "查看更多方案 ∨"}
          </button>

          {showMore && (
            <div className="mt-3 space-y-3">
              {MORE_PLANS.map((p) => (
                <PlanCard
                  key={p.key}
                  plan={p}
                  isOpen={openTutorial === p.key}
                  onToggle={() =>
                    setOpenTutorial((cur) => (cur === p.key ? null : p.key))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  isOpen,
  onToggle,
}: {
  plan: Plan;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-800">
            {plan.icon} {plan.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{plan.subtitle}</p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
            {plan.detail.map((d, i) => (
              <li key={i}>· {d}</li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="shrink-0 text-xs font-medium text-blue-700 hover:underline"
        >
          {isOpen ? "收起教程" : "查看申请教程"}
        </button>
      </div>

      {isOpen && (
        <ol className="mt-3 list-decimal space-y-1.5 rounded border border-slate-200 bg-white px-5 py-3 text-xs text-slate-600">
          {plan.steps.map((step, i) => (
            <li key={i} className="pl-1">
              {renderStep(step)}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function renderStep(
  step:
    | string
    | { text: string; link?: { href: string; label: string }; suffix?: string }
): React.ReactNode {
  if (typeof step === "string") return step;
  return (
    <>
      {step.text}
      {step.link && (
        <a
          href={step.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-blue-700 hover:underline"
        >
          {step.link.label}
        </a>
      )}
      {step.suffix}
    </>
  );
}

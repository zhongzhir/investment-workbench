import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode; // emoji 或 SVG 节点
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

// 列表/页面空状态。统一视觉：64px 图标、居中、克制色彩。
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div
        className="text-[64px] leading-none opacity-60"
        aria-hidden="true"
      >
        {icon}
      </div>
      <p className="mt-4 text-base font-medium text-slate-700">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      )}
      {action &&
        (action.href ? (
          <a
            href={action.href}
            className="mt-6 inline-flex items-center rounded-lg bg-[#1B6FE8] px-4 py-2 text-sm font-medium tracking-[0.01em] text-white transition-colors duration-150 hover:bg-[#1762d0]"
          >
            {action.label}
          </a>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-6 inline-flex items-center rounded-lg bg-[#1B6FE8] px-4 py-2 text-sm font-medium tracking-[0.01em] text-white transition-colors duration-150 hover:bg-[#1762d0]"
          >
            {action.label}
          </button>
        ))}
    </div>
  );
}

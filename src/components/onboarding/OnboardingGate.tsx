"use client";

import { useState } from "react";
import { OnboardingDialog } from "./OnboardingDialog";

// 仅在 dashboard 页挂载，由父级 server 组件查询数据库后决定是否传 show=true
export function OnboardingGate({ show }: { show: boolean }) {
  const [open, setOpen] = useState(show);
  if (!open) return null;
  return <OnboardingDialog onClose={() => setOpen(false)} />;
}

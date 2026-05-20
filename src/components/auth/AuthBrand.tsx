// 认证页顶部品牌区。
export function AuthBrand({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <div className="text-2xl tracking-tight text-ink">
        <span className="font-light">Ai</span>
        <span className="font-bold">vestor</span>
      </div>
      <p className="mt-1.5 text-sm text-ink-faint">{subtitle}</p>
    </div>
  );
}

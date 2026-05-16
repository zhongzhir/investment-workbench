// 认证页顶部品牌区。
export function AuthBrand({ subtitle }: { subtitle: string }) {
  return (
    <div className="mb-8 text-center">
      <div className="text-2xl font-semibold tracking-tight text-ink">
        Vestia
      </div>
      <p className="mt-1.5 text-sm text-ink-faint">{subtitle}</p>
    </div>
  );
}

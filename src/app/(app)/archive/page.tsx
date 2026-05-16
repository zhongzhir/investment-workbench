// 投后归档页。MVP 占位：后续接入报告归档列表与 Word 导出。
export default function ArchivePage() {
  return (
    <div className="mx-auto max-w-doc px-6 py-12">
      <h1 className="text-xl font-semibold text-ink">投后归档</h1>
      <p className="mt-2 text-sm text-ink-soft">
        已完成的项目分析报告归档于此，可随时导出 Word 文档。
      </p>

      <div className="mt-10 rounded-lg border border-dashed border-line py-16 text-center">
        <p className="text-sm text-ink-soft">暂无归档报告</p>
      </div>
    </div>
  );
}

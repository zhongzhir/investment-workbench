// 知识库页。MVP 占位：后续接入文档上传、标签分类与语义检索。
export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-doc px-6 py-12">
      <h1 className="text-xl font-semibold text-ink">知识库</h1>
      <p className="mt-2 text-sm text-ink-soft">
        你的私有知识沉淀。所有文档与判断仅你可见，越用越懂你。
      </p>

      <div className="mt-10 rounded-lg border border-dashed border-line py-16 text-center">
        <p className="text-sm text-ink-soft">知识库为空</p>
        <p className="mt-1 text-xs text-ink-faint">
          上传历史文档、研究报告或投资笔记，构建你的知识体系。
        </p>
      </div>
    </div>
  );
}

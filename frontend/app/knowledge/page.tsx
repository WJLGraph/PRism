"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, GitBranch, Search } from "lucide-react";

import { apiGet } from "@/lib/api";
import { formatDate, formatNumber, type KnowledgeBase } from "@/lib/rag";

export default function KnowledgeBasesPage() {
  const [items, setItems] = useState<KnowledgeBase[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiGet<KnowledgeBase[]>("/api/rag/repositories")
      .then(setItems)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = items.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      <header className="page-title animate-fade-up">
        <div>
          <div className="mono-eyebrow mb-3 text-prism">05 / Project knowledge</div>
          <h1>项目知识</h1>
        </div>
        <div>
          <p>每个 GitHub Repository 拥有独立的文档、分段和检索配置。知识边界与项目边界保持一致。</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-2 text-sm text-prism hover:underline">
            <GitBranch className="h-4 w-4" /> 连接仓库
          </Link>
        </div>
      </header>

      <div className="knowledge-index">
      <div className="knowledge-search flex flex-col border-y border-hair bg-surface sm:flex-row">
        <label className="flex min-h-14 flex-1 items-center gap-3 border-b border-hair px-4 sm:border-b-0 sm:border-r">
          <Search className="h-4 w-4 text-mute" />
          <span className="sr-only">搜索项目</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索项目名称或描述"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-dim"
          />
          <span className="font-mono text-[10px] tabular-nums text-dim">{visible.length} / {items.length}</span>
        </label>
        <div className="flex items-center gap-2 px-4 py-3 font-mono text-[9px] uppercase tracking-[0.13em] text-mute sm:w-72">
          <span className="status-dot" />
          RAG corpus directory
        </div>
      </div>

      {error && <div className="mt-0 border border-t-0 border-blush/30 bg-blush/10 p-4 text-sm text-blush">{error}</div>}
      {loading && <div className="grid min-h-80 place-items-center border border-t-0 border-hair bg-surface text-sm text-mute">正在读取知识库...</div>}

      {!loading && !visible.length && (
        <div className="page-empty border-t-0">
          <div>
            <BookOpen className="mx-auto mb-4 h-8 w-8 text-prism" />
            <h2 className="font-display text-xl text-ink">{query ? "没有匹配的项目" : "先连接一个 GitHub 仓库"}</h2>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6">
              {query ? "换个名称或描述试试。" : "Repository 是 RAG 的项目边界。连接仓库后，再上传 Markdown、PDF、DOCX 等项目资料。"}
            </p>
            {!query && (
              <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm text-prism">
                连接仓库 <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="knowledge-grid grid gap-px bg-hair md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <Link
            key={item.id}
            href={`/knowledge/${item.id}`}
            className="group flex min-h-72 flex-col bg-surface p-6 transition-colors hover:bg-panel"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="page-kicker">Knowledge base</div>
                <h2 className="mt-3 break-all font-display text-2xl font-semibold leading-tight text-ink">{item.name}</h2>
                <p className="mt-1 font-mono text-[10px] text-mute">更新于 {formatDate(item.updated_at)}</p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-dim transition-transform duration-500 group-hover:translate-x-1.5 group-hover:text-prism" />
            </div>
            <p className="mt-5 break-words text-xs leading-6 text-body [overflow-wrap:anywhere]">{item.description || "暂无描述"}</p>
            <div className="mt-auto grid grid-cols-3 gap-3 border-t border-hair pt-4 text-[10px] text-mute">
              <span><strong className="block font-display text-xl font-semibold tabular-nums text-ink">{formatNumber(item.document_count)}</strong>文档</span>
              <span><strong className="block font-display text-xl font-semibold tabular-nums text-ink">{formatNumber(item.chunk_count)}</strong>分段</span>
              <span>
                <strong className={`block font-mono text-[11px] font-medium ${item.runtime.embedding.available ? "text-mint" : "text-honey"}`}>
                  {item.runtime.embedding.available ? "READY" : "DEGRADED"}
                </strong>
                {item.runtime.embedding.available ? "模型就绪" : "降级运行"}
              </span>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Database, FileText, GitBranch, Search } from "lucide-react";

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
    <div className="mx-auto min-h-[calc(100vh-74px)] max-w-7xl px-2 py-5 sm:px-5">
      <header className="animate-fade-up flex flex-col gap-4 border-b border-hair pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mono-eyebrow mb-2 flex items-center gap-2">
            <Database className="h-3.5 w-3.5" /> RAG Knowledge
          </div>
          <h1 className="font-display text-[clamp(1.6rem,2.4vw,2.1rem)] font-semibold leading-tight tracking-tight2 text-ink">项目知识</h1>
          <p className="mt-2 text-sm leading-relaxed text-mute">每个 GitHub Repository 拥有独立的文档、分段和检索配置。</p>
        </div>
        <Link
          href="/"
          className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-prism px-5 text-sm font-medium text-white shadow-lift transition-all duration-500 ease-silk hover:bg-accent"
        >
          <GitBranch className="h-4 w-4" /> 连接仓库
        </Link>
      </header>
      <div className="spectrum-rule mt-4 w-20 origin-left animate-line-grow" />

      <div className="animate-fade-in stagger-1 my-5 flex max-w-md items-center gap-2 rounded-xl border border-hair bg-surface px-3 py-2.5 shadow-card transition focus-within:border-prism/40">
        <Search className="h-4 w-4 text-mute" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索项目"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-dim"
        />
      </div>

      {error ? <div className="animate-fade-in mb-5 rounded-xl border border-blush/30 bg-blush/10 p-4 text-sm text-blush">{error}</div> : null}
      {loading ? <div className="py-16 text-center text-sm text-mute">正在读取知识库...</div> : null}

      {!loading && !visible.length ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-hair bg-surface px-6 text-center shadow-card">
          <BookOpen className="mb-4 h-9 w-9 text-prism" />
          <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">{query ? "没有匹配的项目" : "先连接一个 GitHub 仓库"}</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-mute">
            {query ? "换个名称或描述试试。" : "Repository 是 RAG 的项目边界。连接仓库后，再上传 Markdown、PDF、DOCX 等项目资料。"}
          </p>
          {!query ? (
            <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-prism transition hover:gap-2.5 hover:text-prism">
              连接仓库 <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <Link
            key={item.id}
            href={`/knowledge/${item.id}`}
            className="group animate-fade-in rounded-2xl border border-hair bg-surface p-5 shadow-card card-lift hover:border-prism/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-prism">
                  <BookOpen className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="break-all text-sm font-semibold text-ink">{item.name}</h2>
                  <p className="mt-0.5 text-xs text-mute">更新于 {formatDate(item.updated_at)}</p>
                </div>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-dim transition-all duration-500 ease-silk group-hover:translate-x-1 group-hover:text-prism" />
            </div>
            <p className="mt-4 break-words text-sm leading-6 text-body">{item.description || "暂无描述"}</p>
            <div className="mt-4 flex items-center gap-4 border-t border-hair pt-3 text-xs text-mute">
              <span className="inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> <span className="font-mono tabular-nums">{formatNumber(item.document_count)}</span> 文档</span>
              <span><span className="font-mono tabular-nums">{formatNumber(item.chunk_count)}</span> 分段</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ${item.runtime.embedding.available ? "bg-mint/10 text-mint" : "bg-honey/10 text-honey"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${item.runtime.embedding.available ? "bg-mint" : "bg-honey"}`} />
                {item.runtime.embedding.available ? "模型就绪" : "降级运行"}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

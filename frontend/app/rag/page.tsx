"use client";

import {
  BookOpen,
  Database,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { apiDelete, apiGet, apiPost, apiUpload } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { AppSelect } from "@/components/ui/select";

type KnowledgeItem = {
  id: string;
  source_type: string;
  title: string;
  content_preview: string;
  metadata: Record<string, unknown>;
  chunk_count: number;
  created_at?: string | null;
};

type RAGSource = {
  citation: number;
  document_id: string;
  source_id: string;
  source_type: string;
  title: string;
  snippet: string;
  score: number;
  metadata: Record<string, unknown>;
  retrieval: Record<string, unknown>;
};

type RAGAnswer = {
  question: string;
  answer: string;
  sources: RAGSource[];
  retrieval_count: number;
  generation_mode: "llm" | "extractive" | "no_evidence";
  model?: string | null;
  took_ms: number;
};

type RAGSearch = {
  query: string;
  results: RAGSource[];
  result_count: number;
  took_ms: number;
};

type RAGStatus = {
  repo_id: string;
  document_count: number;
  source_count: number;
  source_types: Record<string, number>;
  embedding: { provider?: string; model?: string; dimensions?: number };
  vector_store: { backend?: string; status?: string; available?: boolean; error?: string | null; fallback?: string };
  generation: { llm_configured?: boolean; model?: string | null; fallback?: string };
  supported_files: string[];
};

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: RAGAnswer["generation_mode"];
  tookMs?: number;
  sourceCount?: number;
};

const sourceTypeLabels: Record<string, string> = {
  knowledge_file: "文档",
  memory_note: "笔记",
  project_doc: "项目文档",
  project_overview: "项目概览",
  issue: "Issue",
  pull_request: "PR",
  workflow_run: "CI",
  team_member: "成员",
  weekly_report: "周报",
};

function sourceLabel(value: string) {
  return sourceTypeLabels[value] ?? value.replaceAll("_", " ");
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export default function RAGPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [status, setStatus] = useState<RAGStatus | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sources, setSources] = useState<RAGSource[]>([]);
  const [question, setQuestion] = useState("");
  const [topK, setTopK] = useState(5);
  const [sourceType, setSourceType] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const qaScrollRef = useRef<HTMLDivElement>(null);

  const currentRepo = useMemo(() => repos.find((repo) => repo.id === repoId) ?? null, [repos, repoId]);
  const availableSourceTypes = useMemo(() => Object.keys(status?.source_types ?? {}).sort(), [status]);

  async function loadRepos(preferredId?: string) {
    const items = await apiGet<Repository[]>("/api/rag/repositories");
    setRepos(items);
    const nextId = preferredId && items.some((item) => item.id === preferredId) ? preferredId : repoId && items.some((item) => item.id === repoId) ? repoId : items[0]?.id ?? "";
    setRepoId(nextId);
  }

  async function loadKnowledge(id: string) {
    const [nextKnowledge, nextStatus] = await Promise.all([
      apiGet<KnowledgeItem[]>(`/api/repos/${id}/knowledge`),
      apiGet<RAGStatus>(`/api/rag/${id}/status`),
    ]);
    setKnowledge(nextKnowledge);
    setStatus(nextStatus);
  }

  useEffect(() => {
    loadRepos().catch((loadError) => setError(errorMessage(loadError)));
  }, []);

  useEffect(() => {
    if (!repoId) {
      setKnowledge([]);
      setStatus(null);
      return;
    }
    setError(null);
    loadKnowledge(repoId).catch((loadError) => setError(errorMessage(loadError)));
  }, [repoId]);

  useEffect(() => {
    const node = qaScrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  async function uploadFile(file?: File) {
    if (!file || !repoId) return;
    setBusy("upload");
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("file", file);
      await apiUpload(`/api/rag/repositories/${repoId}/documents`, body);
      setNotice("文件已提交，正在解析、分段并建立索引");
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      await loadKnowledge(repoId);
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removeKnowledge(item: KnowledgeItem) {
    if (!repoId || !window.confirm(`删除“${item.title}”及其全部切片？`)) return;
    setBusy(`delete:${item.id}`);
    setError(null);
    try {
      await apiDelete(`/api/rag/repositories/${repoId}/documents/${item.id}`);
      await loadKnowledge(repoId);
      setNotice("资料已从索引中删除");
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setBusy(null);
    }
  }

  async function reindex() {
    if (!repoId) return;
    setBusy("reindex");
    setError(null);
    try {
      const result = await apiPost<{ indexed_documents: number }>(`/api/rag/${repoId}/reindex`, {});
      await loadKnowledge(repoId);
      setNotice(`已重建 ${result.indexed_documents} 个文档向量`);
    } catch (reindexError) {
      setError(errorMessage(reindexError));
    } finally {
      setBusy(null);
    }
  }

  function queryBody() {
    return { question: question.trim(), top_k: topK, source_types: sourceType ? [sourceType] : [] };
  }

  async function ask() {
    const prompt = question.trim();
    if (!repoId || !prompt || busy) return;
    setTurns((current) => [...current, { id: crypto.randomUUID(), role: "user", content: prompt }]);
    setQuestion("");
    setBusy("ask");
    setError(null);
    try {
      const result = await apiPost<RAGAnswer>(`/api/rag/${repoId}/ask`, { ...queryBody(), question: prompt });
      setSources(result.sources);
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: result.answer,
          mode: result.generation_mode,
          tookMs: result.took_ms,
          sourceCount: result.retrieval_count,
        },
      ]);
    } catch (askError) {
      setError(errorMessage(askError));
      setTurns((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "请求失败，请检查后端配置后重试。", mode: "no_evidence" }]);
    } finally {
      setBusy(null);
    }
  }

  async function searchOnly() {
    if (!repoId || !question.trim() || busy) return;
    setBusy("search");
    setError(null);
    try {
      const result = await apiPost<RAGSearch>(`/api/rag/${repoId}/search`, queryBody());
      setSources(result.results);
      setNotice(`召回 ${result.result_count} 条证据，耗时 ${result.took_ms} ms`);
    } catch (searchError) {
      setError(errorMessage(searchError));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rag-shell flex h-[100dvh] min-h-[620px] flex-col overflow-hidden bg-canvas">
      <header className="animate-fade-up flex flex-wrap items-center justify-between gap-3 border-b border-hair bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-prism text-white shadow-lift">
            <BookOpen className="h-4 w-4" />
          </span>
          <div>
            <h1 className="font-display text-lg font-semibold tracking-tight2 text-ink">RAG 工作室</h1>
            <p className="mono-eyebrow mt-0.5">{currentRepo?.full_name ?? "未选择项目"}</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <AppSelect
            value={repoId}
            onChange={(value) => {
              setRepoId(value);
              setTurns([]);
              setSources([]);
            }}
            className="h-9 min-w-0 max-w-64"
            ariaLabel="选择项目"
            options={[
              ...(repos.length === 0 ? [{ value: "", label: "暂无项目" }] : []),
              ...repos.map((repo) => ({ value: repo.id, label: repo.full_name }))
            ]}
          />
          {repoId ? <Link href={`/knowledge/${repoId}`} className="hidden h-9 items-center rounded-lg border border-hair bg-surface px-3 text-sm text-body transition-colors hover:border-prism/30 hover:bg-panel sm:inline-flex">管理项目知识</Link> : null}
          <button type="button" onClick={() => repoId && loadKnowledge(repoId)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-hair bg-surface text-body transition-colors hover:bg-panel" title="刷新" aria-label="刷新">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="animate-fade-up stagger-1 grid border-b border-hair bg-surface sm:grid-cols-2 lg:grid-cols-[0.72fr_0.66fr_1.05fr_1.28fr_1.29fr]">
        <StatusItem label="资料" value={`${status?.source_count ?? 0} 份`} />
        <StatusItem label="切片" value={`${status?.document_count ?? 0} 条`} />
        <StatusItem label="Embedding" value={status ? `${status.embedding.provider} · ${status.embedding.dimensions}d` : "-"} />
        <StatusItem
          label="向量索引"
          value={
            status?.vector_store ? (
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status.vector_store.available === false ? "bg-honey" : "bg-mint"}`}
                />
                {status.vector_store.backend ?? "vector"} ·{" "}
                {status.vector_store.available === false ? "降级（关键词检索）" : status.vector_store.status ?? "ready"}
              </span>
            ) : (
              "-"
            )
          }
        />
        <StatusItem label="生成" value={status?.generation.llm_configured ? status.generation.model ?? "LLM" : "本地证据模式"} />
      </div>

      {(error || notice) && (
        <div className={`border-b px-4 py-2 text-sm ${error ? "border-blush/30 bg-blush/10 text-blush" : "border-mint/30 bg-mint/10 text-mint"}`}>
          {error ?? notice}
        </div>
      )}

      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[200px_minmax(0,1fr)_210px] lg:overflow-hidden xl:grid-cols-[250px_minmax(0,1fr)_280px] 2xl:grid-cols-[290px_minmax(0,1fr)_330px]">
        <aside className="animate-fade-up stagger-2 flex min-h-[360px] flex-col border-r border-hair bg-panel lg:min-h-0">
          <div className="flex items-center justify-between border-b border-hair px-4 py-3">
            <div className="mono-eyebrow flex items-center gap-2 text-prism"><Database className="h-3.5 w-3.5" />知识库</div>
            <button type="button" onClick={reindex} disabled={!repoId || busy === "reindex"} title="重建向量索引" aria-label="重建向量索引" className="flex h-8 w-8 items-center justify-center rounded-lg text-mute transition-colors hover:bg-surface disabled:opacity-50">
              <RefreshCw className={`h-4 w-4 ${busy === "reindex" ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="border-b border-hair p-3">
            <input ref={fileInput} type="file" accept={(status?.supported_files ?? []).join(",")} className="hidden" onChange={(event) => uploadFile(event.target.files?.[0])} />
            <button type="button" disabled={!repoId || busy === "upload"} onClick={() => fileInput.current?.click()} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-prism/40 bg-surface text-sm font-medium text-prism transition-all duration-500 ease-silk hover:border-prism/60 hover:bg-prism/5 disabled:opacity-50">
              {busy === "upload" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {busy === "upload" ? "解析与入库中" : "上传资料"}
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {knowledge.length === 0 && <EmptyPanel icon={FileText} label="知识库为空" />}
            {knowledge.map((item) => (
              <div key={`${item.source_type}:${item.id}`} className="card-lift group rounded-xl border border-hair bg-surface p-3 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="break-words text-sm font-medium text-ink">{item.title}</div>
                    <div className="mt-1 font-mono text-[11px] text-mute">{sourceLabel(item.source_type)} · {item.chunk_count} 切片 {formatDate(item.created_at)}</div>
                  </div>
                  <button type="button" onClick={() => removeKnowledge(item)} disabled={busy === `delete:${item.id}`} title="删除资料" aria-label="删除资料" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-mute opacity-0 transition-all hover:bg-blush/10 hover:text-blush group-hover:opacity-100 focus:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-2 break-words text-xs leading-5 text-body">{item.content_preview}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="animate-fade-up stagger-2 flex min-h-[520px] min-w-0 flex-col bg-surface lg:min-h-0">
          <div className="flex items-center justify-between border-b border-hair px-4 py-3">
            <div className="mono-eyebrow flex items-center gap-2 text-prism"><Sparkles className="h-3.5 w-3.5" />问答</div>
            {turns.length > 0 && <button type="button" onClick={() => { setTurns([]); setSources([]); }} className="text-xs text-mute transition-colors hover:text-ink">清空会话</button>}
          </div>
          <div ref={qaScrollRef} className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto px-4 py-5">
            {turns.length === 0 && (
              <div className="my-auto flex flex-col items-center gap-4 py-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-prism/40 bg-prism/5">
                  <BookOpen className="h-6 w-6 text-prism/70" />
                </span>
                <div>
                  <div className="font-display text-lg font-semibold tracking-tight2 text-ink">
                    {status?.document_count ? "知识库已就绪" : "知识库还是空的"}
                  </div>
                  <p className="mt-1.5 max-w-sm text-sm leading-6 text-mute">
                    {status?.document_count
                      ? "提出关于项目资料的问题，系统会检索证据并生成带引用的回答。"
                      : "先在左侧上传资料或同步项目文档，再开始提问。"}
                  </p>
                </div>
                {status?.document_count ? (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {["项目里有哪些核心模块？", "总结最近的 Issue 进展", "README 里说明了什么？"].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setQuestion(suggestion)}
                        className="rounded-full border border-hair bg-surface px-3 py-1.5 text-xs text-body transition-all duration-500 ease-silk hover:border-prism/40 hover:text-ink"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
            {turns.map((turn) => (
              <div key={turn.id} className={turn.role === "user" ? "ml-auto max-w-[82%]" : "max-w-[92%]"}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-7 ${turn.role === "user" ? "bg-prism text-white shadow-lift" : "border border-hair bg-panel text-ink shadow-card"}`}>
                  {turn.role === "assistant" ? <div className="markdown-body"><ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown></div> : turn.content}
                </div>
                {turn.role === "assistant" && (
                  <div className="mt-1.5 flex flex-wrap gap-2 font-mono text-[11px] text-mute">
                    <span>{turn.mode === "llm" ? "LLM 生成" : turn.mode === "extractive" ? "证据提取" : "无证据"}</span>
                    <span>{turn.sourceCount ?? 0} 个引用</span>
                    {typeof turn.tookMs === "number" && <span>{turn.tookMs} ms</span>}
                  </div>
                )}
              </div>
            ))}
            {busy === "ask" && <div className="flex items-center gap-2 text-sm text-mute"><LoaderCircle className="h-4 w-4 animate-spin text-prism" />正在检索并生成回答</div>}
          </div>
          <div className="border-t border-hair bg-panel p-3">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  ask();
                }
              }}
              placeholder="向当前知识库提问"
              rows={3}
              className="w-full resize-none rounded-xl border border-hair bg-surface px-3 py-2 text-sm leading-6 text-ink outline-none transition-colors focus:border-prism"
            />
            <div className="mt-2 flex flex-nowrap items-center gap-1.5">
              <AppSelect value={sourceType} onChange={setSourceType} className="h-9 w-[100px] shrink-0" ariaLabel="资料类型" options={[{ value: "", label: "全部资料" }, ...availableSourceTypes.map((type) => ({ value: type, label: sourceLabel(type) }))]} />
              <label className="flex h-9 shrink-0 items-center gap-1 rounded-xl border border-hair bg-surface px-2 text-[11px] text-body" title="每次检索返回的证据条数">
                <span className="whitespace-nowrap text-mute">Top K</span>
                <AppSelect value={String(topK)} onChange={(value) => setTopK(Number(value))} className="h-7 w-11 shrink-0 [&_button]:rounded-lg [&_button]:border-0 [&_button]:bg-surface-2/70 [&_button]:px-1.5 [&_button]:py-0 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-ink" options={[3, 5, 8, 10].map((value) => ({ value: String(value), label: String(value) }))} />
              </label>
              <div className="min-w-0 flex-1" />
              <button type="button" title="只检索证据" onClick={searchOnly} disabled={!repoId || !question.trim() || Boolean(busy)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hair bg-surface text-body transition-colors hover:bg-panel disabled:opacity-40"><Search className="h-4 w-4" /></button>
              <button type="button" onClick={ask} disabled={!repoId || !question.trim() || Boolean(busy)} className="sheen inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-prism px-3 text-sm font-medium text-white shadow-lift transition-all duration-500 ease-silk hover:bg-accent disabled:opacity-40"><Send className="h-4 w-4" />提问</button>
            </div>
          </div>
        </main>

        <aside className="animate-fade-up stagger-3 flex min-h-[360px] flex-col border-l border-hair bg-panel lg:min-h-0">
          <div className="flex items-center justify-between border-b border-hair px-4 py-3">
            <div className="mono-eyebrow flex items-center gap-2 text-prism"><Search className="h-3.5 w-3.5" />检索证据</div>
            <span className="font-mono text-xs text-mute">{sources.length} 条</span>
          </div>
          <div className="flex min-h-0 flex-1 flex-col space-y-3 overflow-y-auto p-3">
            {sources.length === 0 && <EmptyPanel icon={Search} label="暂无检索结果" hint="提问或点击「只检索」后，命中的证据片段会出现在这里。" />}
            {sources.map((source) => (
              <article key={`${source.document_id}:${source.citation}`} className="card-lift rounded-xl border border-hair bg-surface p-3 shadow-card">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-prism font-mono text-xs font-semibold text-white">{source.citation}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-sm font-medium leading-snug text-ink">{source.title}</h2>
                    <div className="mt-1 font-mono text-[11px] text-mute">{sourceLabel(source.source_type)} · {(source.score * 100).toFixed(1)}%</div>
                  </div>
                </div>
                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-prism/15"><div className="h-full rounded-full bg-prism" style={{ width: `${Math.max(3, Math.min(100, source.score * 100))}%` }} /></div>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-body">{source.snippet}</p>
                {Boolean(source.metadata.filename || source.metadata.path) && <div className="mt-2 break-all border-t border-hair pt-2 font-mono text-[11px] text-mute">{String(source.metadata.filename ?? source.metadata.path)}</div>}
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 border-b border-r border-hair px-3 py-2.5 last:border-r-0 sm:border-b-0">
      <div className="mono-eyebrow whitespace-nowrap">{label}</div>
      <div className="mt-1 break-words font-display text-[12.5px] font-semibold leading-[1.35] tracking-tight2 tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
}

function EmptyPanel({ icon: Icon, label, hint }: { icon: typeof Search; label: string; hint?: string }) {
  return (
    <div className="my-auto flex min-h-36 flex-1 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-hair bg-surface/60 p-6 text-center text-sm text-mute">
      <Icon className="h-5 w-5 text-dim" />
      <span className="mono-eyebrow">{label}</span>
      {hint && <p className="max-w-[240px] text-xs leading-5 text-mute/80">{hint}</p>}
    </div>
  );
}

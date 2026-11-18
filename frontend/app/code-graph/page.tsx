"use client";

import { useEffect, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { PageTitle, PrimaryButton } from "@/components/ui/card";
import { AppSelect } from "@/components/ui/select";

type PullRequest = {
  id: string;
  number: number;
  title: string;
  head_branch?: string | null;
};

type CodeGraph = {
  query: string;
  symbols: Array<{ id: string; path: string; name: string; kind: string; start_line?: number | null; pr_number?: number | null }>;
  relations: Array<{ id: string; source_name?: string | null; target_name: string; relation_type: string; path?: string | null; pr_number?: number | null }>;
  documents: Array<{ id: string; title: string; path?: string; snippet: string; pr_number?: number | null }>;
};

type PrSnapshot = {
  status: string;
  message?: string | null;
  snapshot_name?: string | null;
  branch?: string | null;
  commit_sha?: string | null;
  pr_id?: string | null;
  pr_number?: number | null;
  indexed_symbols?: number | null;
};

export default function CodeGraphPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState("");
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [prId, setPrId] = useState("");
  const [query, setQuery] = useState("");
  const [graph, setGraph] = useState<CodeGraph | null>(null);
  const [snapshot, setSnapshot] = useState<PrSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPrs(id: string) {
    if (!id) return;
    const items = await apiGet<PullRequest[]>(`/api/repos/${id}/pull-requests`).catch(() => []);
    setPrs(items);
    setPrId(items[0]?.id || "");
    setSnapshot(null);
  }

  useEffect(() => {
    apiGet<Repository[]>("/api/repos")
      .then((items) => {
        setRepos(items);
        setRepoId(items[0]?.id || "");
        return loadPrs(items[0]?.id || "");
      })
      .catch(() => setRepos([]));
  }, []);

  async function searchGraph(snapshotPrId?: string) {
    if (!repoId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ q: query });
      const activeSnapshotPrId = snapshotPrId ?? (snapshot?.status === "ready" ? prId : "");
      if (activeSnapshotPrId) params.set("pr_id", activeSnapshotPrId);
      setGraph(await apiGet<CodeGraph>(`/api/repos/${repoId}/code-graph/search?${params.toString()}`));
    } finally {
      setLoading(false);
    }
  }

  async function prepareSnapshot() {
    if (!prId) return;
    setLoading(true);
    try {
      const nextSnapshot = await apiPost<PrSnapshot>(`/api/pull-requests/${prId}/snapshot`, {});
      setSnapshot(nextSnapshot);
      await searchGraph(nextSnapshot.status === "ready" ? prId : undefined);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="07 / Code intelligence"
        title="代码图谱"
        description="检索代码 symbol、调用与导入关系，并为 PR 准备独立分支快照。结果、索引和证据在同一条研究路径里。"
      />

      <div className="page-grid grid-cols-[370px_minmax(0,1fr)]">
        <aside className="page-column">
          <div className="page-kicker">Query / 01</div>
          <h2 className="page-section-title">检索控制</h2>
          <p className="page-section-note">选择仓库与检索范围，查询结果会保留在右侧面板中。</p>

          <label className="page-form-field mt-7">
            <span>仓库</span>
            <AppSelect
              value={repoId}
              onChange={(value) => {
                setRepoId(value);
                setGraph(null);
                loadPrs(value);
              }}
              options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
            />
          </label>
          <label className="page-form-field mt-5">
            <span>搜索 symbol / path</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchGraph()} />
          </label>
          <PrimaryButton className="mt-5 w-full" disabled={!repoId || loading} onClick={() => searchGraph()}>
            {loading ? "检索中..." : "搜索图谱"}
          </PrimaryButton>

          <div className="mt-9 border-t border-hair pt-7">
            <div className="page-kicker">Snapshot / 02</div>
            <h3 className="page-section-title">PR 分支快照</h3>
            <p className="page-section-note">快照准备后，PR 自身分支中的代码符号会与主分支索引隔离。</p>
            <label className="page-form-field mt-5">
              <span>Pull Request</span>
              <AppSelect
                value={prId}
                onChange={(value) => {
                  setPrId(value);
                  setSnapshot(null);
                  setGraph(null);
                }}
                options={prs.map((pr) => ({ value: pr.id, label: `#${pr.number} ${pr.title}` }))}
              />
            </label>
            <PrimaryButton className="mt-5 w-full" disabled={!prId || loading} onClick={prepareSnapshot}>
              准备 PR 快照
            </PrimaryButton>

            {snapshot && (
              <div className="mt-5 border border-hair bg-panel p-4">
                <div className="text-sm font-medium text-ink">{snapshot.snapshot_name || "PR 分支快照"}</div>
                <div className="mt-3 grid gap-2 font-mono text-[10px] uppercase leading-5 text-mute">
                  <div>状态 / {snapshot.status}</div>
                  {snapshot.branch && <div>分支 / {snapshot.branch}</div>}
                  {snapshot.commit_sha && <div>Commit / {snapshot.commit_sha.slice(0, 12)}</div>}
                  {typeof snapshot.indexed_symbols === "number" && <div>Symbols / {snapshot.indexed_symbols}</div>}
                  {snapshot.message && <div className="normal-case">{snapshot.message}</div>}
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="page-column">
          <section>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="page-kicker">Index / 03</div>
                <h2 className="page-section-title">Symbols</h2>
              </div>
              <span className="font-mono text-xs text-mute">{graph?.symbols.length ?? 0} indexed</span>
            </div>
            <div className="mt-5">
              {(graph?.symbols || []).map((item) => (
                <div key={item.id} className="flex flex-wrap items-baseline gap-x-3 border-t border-hair py-3 text-sm">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="font-mono text-[10px] text-mute">
                    {item.kind} · {item.path}:{item.start_line || 1}{item.pr_number ? ` · PR #${item.pr_number}` : ""}
                  </span>
                </div>
              ))}
              {!graph && <div className="page-empty min-h-44">先在左侧点击「搜索图谱」触发一次索引，这里会列出类、函数等代码符号。</div>}
              {graph && !graph.symbols.length && <div className="page-empty min-h-36">没有匹配的代码符号。</div>}
            </div>
          </section>

          <section className="mt-10 border-t border-hair pt-9">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="page-kicker">Graph / 04</div>
                <h2 className="page-section-title">Relations</h2>
              </div>
              <span className="font-mono text-xs text-mute">max 30</span>
            </div>
            <div className="mt-5">
              {(graph?.relations || []).slice(0, 30).map((item) => (
                <div key={item.id} className="border-t border-hair py-3 font-mono text-xs leading-6 text-body">
                  <span className="text-ink">{item.source_name || item.path || "module"}</span>
                  <span className="mx-2 text-dim">→ {item.relation_type} →</span>
                  <span className="text-ink">{item.target_name}</span>
                  {item.pr_number ? <span className="ml-2 text-mute">PR #{item.pr_number}</span> : null}
                </div>
              ))}
              {!(graph?.relations || []).length && <div className="page-empty min-h-36">暂无调用/导入关系；索引完成后会自动展示模块之间的关联。</div>}
            </div>
          </section>

          <section className="mt-10 border-t border-hair pt-9">
            <div className="page-kicker">Evidence / 05</div>
            <h2 className="page-section-title">相关代码片段</h2>
            {(graph?.documents || []).map((item) => (
              <pre key={item.id} className="mt-5 max-h-56 overflow-auto whitespace-pre-wrap border border-hair bg-canvas p-5 font-mono text-[11px] leading-6 text-body">
                {item.title}
                {"\n\n"}
                {item.snippet}
              </pre>
            ))}
            {!(graph?.documents || []).length && <div className="page-empty mt-5 min-h-40">还没有关联的代码文档片段；触发 PR 准备或索引后会出现在这里。</div>}
          </section>
        </main>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";

import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { Card, PageTitle, PrimaryButton } from "@/components/ui/card";
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
      <PageTitle title="代码图谱" description="检索代码 symbol、调用/导入关系，并为 PR 准备独立分支快照。" />
      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className="animate-fade-in stagger-1 self-start">
          <div className="mono-eyebrow mb-5">Query / 检索控制</div>
          <label className="text-sm font-medium text-body">
            仓库
            <AppSelect
              className="mt-2 w-full"
              value={repoId}
              onChange={(value) => {
                setRepoId(value);
                setGraph(null);
                loadPrs(value);
              }}
              options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
            />
          </label>
          <label className="mt-5 block text-sm font-medium text-body">
            搜索 symbol / path
            <input className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <PrimaryButton className="mt-4" disabled={!repoId || loading} onClick={() => searchGraph()}>
            搜索图谱
          </PrimaryButton>
          <div className="mt-6 border-t border-hair pt-5">
            <div className="mono-eyebrow mb-4">Snapshot</div>
            <label className="text-sm font-medium text-body">
              PR 分支快照
              <AppSelect
                className="mt-2 w-full"
                value={prId}
                onChange={(value) => {
                  setPrId(value);
                  setSnapshot(null);
                  setGraph(null);
                }}
                options={prs.map((pr) => ({ value: pr.id, label: `#${pr.number} ${pr.title}` }))}
              />
            </label>
            <PrimaryButton className="mt-4" disabled={!prId || loading} onClick={prepareSnapshot}>
              准备 PR 快照
            </PrimaryButton>
            {snapshot && (
              <div className="mt-4 rounded-xl border border-hair bg-panel p-4 text-sm text-body shadow-card">
                <div className="font-medium text-ink">{snapshot.snapshot_name || "PR 分支快照"}</div>
                <div className="mt-2 font-mono text-xs leading-6 text-mute">
                  <div>状态：{snapshot.status}</div>
                  {snapshot.branch && <div>分支：{snapshot.branch}</div>}
                  {snapshot.commit_sha && <div>Commit：{snapshot.commit_sha.slice(0, 12)}</div>}
                  {typeof snapshot.indexed_symbols === "number" && <div>代码图符号：<span className="tabular-nums">{snapshot.indexed_symbols}</span></div>}
                  {snapshot.message && <div className="mt-1 text-mute">{snapshot.message}</div>}
                </div>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-5">
          <Card className="animate-fade-in stagger-2">
            <div className="mono-eyebrow mb-2">Index</div>
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">
              Symbols <span className="ml-1 font-sans text-xs font-normal text-mute">代码符号</span>
            </h2>
            <div className="mt-4 grid gap-2">
              {(graph?.symbols || []).map((item) => (
                <div key={item.id} className="rounded-lg border border-hair bg-panel px-3 py-2 text-sm transition-colors duration-500 ease-silk hover:border-prism/30">
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="ml-2 font-mono text-xs text-mute">
                    {item.kind} · {item.path}:{item.start_line || 1}
                    {item.pr_number ? ` · PR #${item.pr_number}` : ""}
                  </span>
                </div>
              ))}
              {!graph && (
                <div className="rounded-lg border border-dashed border-hair bg-panel px-3 py-5 text-center text-sm text-mute">
                  尚未建立索引：先在上方点击「搜索图谱」触发一次索引，
                  <br />
                  之后这里会列出类、函数等代码符号。
                </div>
              )}
            </div>
          </Card>
          <Card className="animate-fade-in stagger-3">
            <div className="mono-eyebrow mb-2">Graph</div>
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">
              Relations <span className="ml-1 font-sans text-xs font-normal text-mute">调用关系</span>
            </h2>
            <div className="mt-4 grid gap-2">
              {(graph?.relations || []).slice(0, 30).map((item) => (
                <div key={item.id} className="rounded-lg border border-hair bg-panel px-3 py-2 font-mono text-xs leading-6 text-body transition-colors duration-500 ease-silk hover:border-prism/30">
                  {item.source_name || item.path || "module"} - {item.relation_type} - {item.target_name}
                  {item.pr_number ? <span className="ml-2 text-mute">PR #{item.pr_number}</span> : null}
                </div>
              ))}
              {!(graph?.relations || []).length && (
                <div className="rounded-lg border border-dashed border-hair bg-panel px-3 py-5 text-center text-sm text-mute">
                  暂无调用/导入关系数据；索引完成后会自动展示模块之间的关联。
                </div>
              )}
            </div>
          </Card>
          <Card className="animate-fade-in stagger-4">
            <div className="mono-eyebrow mb-2">Evidence</div>
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">
              相关代码片段 <span className="ml-1 font-sans text-xs font-normal text-mute">Snippets</span>
            </h2>
            {(graph?.documents || []).map((item) => (
              <pre key={item.id} className="mt-4 max-h-48 overflow-auto rounded-xl border border-hair bg-surface-2 p-4 font-mono text-xs leading-6 text-body">
                {item.title}
                {"\n\n"}
                {item.snippet}
              </pre>
            ))}
            {!(graph?.documents || []).length && (
              <div className="mt-4 rounded-lg border border-dashed border-hair bg-panel px-3 py-5 text-center text-sm text-mute">
                还没有关联的代码文档片段；触发 PR 准备或索引后会出现在这里。
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FolderGit2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { PageTitle, PrimaryButton } from "@/components/ui/card";
import { AppSelect } from "@/components/ui/select";

type Workspace = {
  id: string;
  name: string;
  description?: string | null;
  repo_ids: string[];
};

type MultiRepoReport = {
  report_markdown: string;
  metrics: Record<string, number>;
  repo_summaries: Array<Record<string, unknown>>;
};

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function WorkspacesPage() {
  const today = useMemo(() => new Date(), []);
  const start = useMemo(() => {
    const value = new Date(today);
    value.setDate(value.getDate() - 6);
    return value;
  }, [today]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("研发团队");
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [startDate, setStartDate] = useState(toDateInput(start));
  const [endDate, setEndDate] = useState(toDateInput(today));
  const [report, setReport] = useState<MultiRepoReport | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const [repoItems, workspaceItems] = await Promise.all([apiGet<Repository[]>("/api/repos"), apiGet<Workspace[]>("/api/workspaces")]);
    setRepos(repoItems);
    setWorkspaces(workspaceItems);
    setSelectedRepos(repoItems.slice(0, 2).map((repo) => repo.id));
    setWorkspaceId(workspaceItems[0]?.id || "");
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function createWorkspace() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiPost<Workspace>("/api/workspaces", { name, repo_ids: selectedRepos });
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    setLoading(true);
    try {
      const data = await apiPost<MultiRepoReport>("/api/workspaces/multi-repo-report", {
        workspace_id: workspaceId || undefined,
        repo_ids: workspaceId ? [] : selectedRepos,
        start_date: startDate,
        end_date: endDate
      });
      setReport(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="04 / Team workspace" title="团队工作区" description="把多个仓库聚合成 workspace，生成跨仓库研发周报和风险概览。" />
      <div className="page-grid grid-cols-[380px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="page-kicker">Workspace / 01</div>
          <h2 className="page-section-title">团队工作区</h2>
          <p className="page-section-note">把多个仓库聚合成一个研究与汇报边界。</p>
          <label className="page-form-field mt-7">
            <span>Workspace 名称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="mt-5 flex items-baseline justify-between">
            <div className="mono-eyebrow !mb-0">仓库</div>
            <span className="font-mono text-[11px] tabular-nums text-mute">已选 {selectedRepos.length}/{repos.length}</span>
          </div>
          <div className="mt-2 space-y-2">
            {repos.map((repo) => (
              <label key={repo.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-hair bg-surface px-3 py-2.5 text-sm text-body transition-all duration-500 ease-silk hover:border-prism/30 has-[:checked]:border-prism/40 has-[:checked]:bg-teal-50/60">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded accent-prism"
                  checked={selectedRepos.includes(repo.id)}
                  onChange={(event) => {
                    setSelectedRepos((current) => (event.target.checked ? [...current, repo.id] : current.filter((id) => id !== repo.id)));
                  }}
                />
                <span className="min-w-0 break-all">{repo.full_name}</span>
              </label>
            ))}
            {repos.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-8 text-center">
                <FolderGit2 size={22} strokeWidth={1.6} className="text-dim" />
                <div className="text-sm font-medium text-body">还没有仓库</div>
                <div className="text-xs leading-5 text-mute">先到工作台连接一个 GitHub 仓库。</div>
              </div>
            )}
          </div>
          <PrimaryButton className="mt-4" disabled={loading || selectedRepos.length === 0} onClick={createWorkspace}>
            创建 Workspace
          </PrimaryButton>

          <div className="mt-5 grid gap-3 border-t border-hair pt-5">
            <label className="page-form-field">
              <span>报表范围</span>
              <AppSelect
                value={workspaceId}
                onChange={setWorkspaceId}
                options={[
                  { value: "", label: "使用上方勾选仓库" },
                  ...workspaces.map((item) => ({ value: item.id, label: item.name }))
                ]}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="page-form-field">
                <span>开始日期</span>
                <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
              </label>
              <label className="page-form-field">
                <span>结束日期</span>
                <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </label>
            </div>
            <PrimaryButton disabled={loading || (!workspaceId && selectedRepos.length === 0)} onClick={generateReport}>
              生成多仓库周报
            </PrimaryButton>
          </div>
        </section>

        <section className="page-column page-column-stack">
          <div className="stack-block">
            <div className="stack-head">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="page-kicker">Directory / 02</div>
                  <h2 className="page-section-title">Workspace 列表</h2>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-mute">
                  {workspaces.length} 个工作区 · 覆盖 {new Set(workspaces.flatMap((item) => item.repo_ids)).size} 个仓库
                </span>
              </div>
            </div>
            <div className="stack-body">
              <div className="space-y-2">
                {workspaces.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-hair bg-panel px-3.5 py-2.5 text-sm text-body transition hover:border-prism/30">
                    <span className="min-w-0 break-words">{item.name}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-mute">{item.repo_ids.length} 个仓库</span>
                  </div>
                ))}
                {workspaces.length === 0 && (
                  <div className="page-empty">
                    <div>
                      <FolderGit2 size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                      <div className="mt-2 text-sm font-medium text-body">暂无 workspace</div>
                      <div className="mx-auto mt-1 max-w-[280px] text-xs leading-5 text-mute">在左侧命名并勾选仓库，创建第一个团队工作区。</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="stack-block">
            <div className="stack-head">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <div className="page-kicker">Weekly digest / 03</div>
                  <h2 className="page-section-title">多仓库周报</h2>
                </div>
                <span className="font-mono text-[11px] tabular-nums text-mute">
                  {report ? `${startDate} → ${endDate}` : "等待生成"}
                </span>
              </div>
            </div>
            <div className="stack-body">
              {report ? (
                <div className="markdown-body text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{report.report_markdown}</ReactMarkdown>
                </div>
              ) : (
                <div className="page-empty">
                  <div>
                    <FileText size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                    <div className="mt-2 text-sm font-medium text-body">周报将在这里生成</div>
                    <div className="mx-auto mt-1 max-w-[320px] text-xs leading-5 text-mute">创建 workspace 或直接勾选仓库，选择时间范围后生成跨仓库研发周报。</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

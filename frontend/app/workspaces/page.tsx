"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FolderGit2 } from "lucide-react";

import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { Card, PageTitle, PrimaryButton } from "@/components/ui/card";
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
      <PageTitle title="团队工作区" description="把多个仓库聚合成 workspace，生成跨仓库研发周报和风险概览。" />
      <div className="animate-fade-up grid gap-5 lg:grid-cols-[380px_1fr] lg:h-[calc(100vh-8rem)]">
        <Card>
          <label className="text-sm font-medium text-body">
            Workspace 名称
            <input className="mt-2 w-full rounded-xl border border-hair bg-surface-2/60 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-prism/40" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="mono-eyebrow mt-6">仓库</div>
          <div className="mt-2 grid gap-2">
            {repos.map((repo) => (
              <label key={repo.id} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-hair bg-surface px-3 py-2.5 text-sm text-body transition-all duration-500 ease-silk hover:border-prism/30">
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
          </div>
          <PrimaryButton className="mt-5" disabled={loading || selectedRepos.length === 0} onClick={createWorkspace}>
            创建 Workspace
          </PrimaryButton>

          <div className="mt-6 grid gap-4 border-t border-hair pt-5">
            <label className="text-sm font-medium text-body">
              报表范围
              <AppSelect
                className="mt-2 w-full"
                value={workspaceId}
                onChange={setWorkspaceId}
                options={[
                  { value: "", label: "使用上方勾选仓库" },
                  ...workspaces.map((item) => ({ value: item.id, label: item.name }))
                ]}
              />
            </label>
            <input className="rounded-xl border border-hair bg-surface-2/60 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-prism/40" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            <input className="rounded-xl border border-hair bg-surface-2/60 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-prism/40" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
            <PrimaryButton disabled={loading || (!workspaceId && selectedRepos.length === 0)} onClick={generateReport}>
              生成多仓库周报
            </PrimaryButton>
          </div>
        </Card>

        <div className="grid min-h-0 gap-5 lg:grid-rows-[minmax(180px,0.8fr)_minmax(0,1.2fr)]">
          <Card className="flex min-h-0 flex-col">
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">Workspace 列表</h2>
            <div className="spectrum-rule mt-2.5 w-10" />
            <div className="mt-4 grid gap-2">
              {workspaces.map((item) => (
                <div key={item.id} className="rounded-xl border border-hair bg-panel px-3.5 py-2.5 text-sm text-body transition hover:border-prism/30">
                  {item.name} · <span className="font-mono tabular-nums text-mute">{item.repo_ids.length}</span> 个仓库
                </div>
              ))}
              {workspaces.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-8 text-center">
                  <FolderGit2 size={22} strokeWidth={1.6} className="text-dim" />
                  <div className="text-sm font-medium text-body">暂无 workspace</div>
                  <div className="max-w-[240px] text-xs leading-5 text-mute">在左侧命名并勾选仓库，创建第一个团队工作区。</div>
                </div>
              )}
            </div>
          </Card>
          <Card className="flex min-h-0 flex-col">
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">多仓库周报</h2>
            <div className="spectrum-rule mt-2.5 w-10" />
            {report ? (
              <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-7 text-ink">{report.report_markdown}</pre>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-8 text-center">
                <FileText size={22} strokeWidth={1.6} className="text-dim" />
                <div className="text-sm font-medium text-body">周报将在这里生成</div>
                <div className="max-w-[260px] text-xs leading-5 text-mute">创建 workspace 或直接勾选仓库，选择时间范围后生成跨仓库研发周报。</div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

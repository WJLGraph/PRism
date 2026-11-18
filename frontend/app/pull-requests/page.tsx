"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, SearchCheck } from "lucide-react";

import { Card, GhostButton, PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";

type PullRequest = {
  id: string;
  number: number;
  title: string;
  state: string;
  files: { filename: string; additions: number; deletions: number }[];
};

export default function PullRequestsPage() {
  const [prs, setPrs] = useState<PullRequest[]>([]);
  const [selected, setSelected] = useState<PullRequest | null>(null);
  const [analysis, setAnalysis] = useState("");

  useEffect(() => {
    apiGet<Repository[]>("/api/repos").then((repos) => {
      if (repos[0]) {
        apiGet<PullRequest[]>(`/api/repos/${repos[0].id}/pull-requests`).then((items) => {
          setPrs(items);
          setSelected(items[0] ?? null);
        });
      }
    });
  }, []);

  async function analyze() {
    if (!selected) return;
    const data = await apiPost(`/api/pull-requests/${selected.id}/analyze`, {});
    setAnalysis(JSON.stringify(data, null, 2));
  }

  return (
    <>
      <PageTitle title="PR Review 助手" description="读取 changed files 和 diff，生成 PR 摘要、风险点、Review Checklist 与测试建议。" />
      <div className="animate-fade-up grid gap-5 lg:grid-cols-[380px_1fr] lg:h-[calc(100vh-13.5rem)]">
        <Card className="animate-fade-up stagger-1 flex min-h-0 flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">Pull Requests</h2>
            <span className="rounded-full border border-hair bg-panel px-2.5 py-1 font-mono text-xs tabular-nums text-mute">{prs.length} 个</span>
          </div>
          <div className="spectrum-rule mt-2.5 w-10" />
          <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {prs.map((pr) => (
              <GhostButton key={pr.id} onClick={() => setSelected(pr)} className={selected?.id === pr.id ? "border-prism/40 bg-teal-50 text-prism" : ""}>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-mute">#{pr.number}</span>
                  <span className="min-w-0">{pr.title}</span>
                </span>
              </GhostButton>
            ))}
            {prs.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-10 text-center">
                <GitPullRequest size={22} strokeWidth={1.6} className="text-dim" />
                <div className="text-sm font-medium text-body">暂无 Pull Request</div>
                <div className="max-w-[240px] text-xs leading-5 text-mute">先在「仓库管理」连接并同步仓库，PR 会自动出现在这里。</div>
              </div>
            )}
          </div>
        </Card>

        <Card className="animate-fade-up stagger-2 flex min-h-0 flex-col">
          <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">Review 报告</h2>
          <div className="spectrum-rule mt-2.5 w-10" />
          {!selected && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-10 text-center">
              <SearchCheck size={22} strokeWidth={1.6} className="text-dim" />
              <div className="text-sm font-medium text-body">尚未选择 PR</div>
              <div className="max-w-[260px] text-xs leading-5 text-mute">从左侧选择一个 PR，Agent 会生成摘要、风险点与 Review Checklist。</div>
            </div>
          )}
          {selected && (
            <div className="mt-4 rounded-xl border border-hair bg-panel p-4">
              <div className="text-sm font-medium text-ink"><span className="font-mono text-xs text-prism">#{selected.number}</span> {selected.title}</div>
              <div className="mono-eyebrow mt-4 mb-2">Changed Files</div>
              <div className="grid gap-2">
                {selected.files.map((file) => (
                  <div key={file.filename} className="flex items-center justify-between rounded-xl border border-hair bg-surface px-3.5 py-2.5 text-sm text-body transition hover:border-prism/30">
                    <span className="min-w-0 font-mono text-xs">{file.filename}</span>
                    <span className="ml-3 shrink-0 whitespace-nowrap font-mono text-[11px] tabular-nums"><span className="text-mint">+{file.additions}</span> <span className="text-blush">-{file.deletions}</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <PrimaryButton onClick={analyze} disabled={!selected} className="mt-5">生成 PR 分析</PrimaryButton>
          {analysis && <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{analysis}</pre>}
        </Card>
      </div>
    </>
  );
}

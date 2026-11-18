"use client";

import { useEffect, useState } from "react";
import { GitPullRequest, SearchCheck } from "lucide-react";

import { GhostButton, PageTitle, PrimaryButton } from "@/components/ui/card";
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
      <PageTitle eyebrow="09 / PR review" title="PR Review 助手" description="读取 changed files 和 diff，生成 PR 摘要、风险点、Review Checklist 与测试建议。" />
      <div className="page-grid grid-cols-[380px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Queue / 01</div>
              <h2 className="page-section-title">Pull Requests</h2>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-mute">{prs.length} 个</span>
          </div>
          <div className="mt-4 space-y-2">
            {prs.map((pr) => (
              <GhostButton key={pr.id} onClick={() => setSelected(pr)} className={`w-full ${selected?.id === pr.id ? "border-prism/40 bg-teal-50 text-prism" : ""}`}>
                <span className="flex items-center gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-mute">#{pr.number}</span>
                  <span className="min-w-0 text-left">{pr.title}</span>
                </span>
              </GhostButton>
            ))}
            {prs.length === 0 && (
              <div className="page-empty">
                <div>
                  <GitPullRequest size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                  <div className="mt-2 text-sm font-medium text-body">暂无 Pull Request</div>
                  <div className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-mute">先在「仓库管理」连接并同步仓库，PR 会自动出现在这里。</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="page-column">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Review / 02</div>
              <h2 className="page-section-title">Review 报告</h2>
            </div>
            <span className="font-mono text-xs text-mute">{selected ? `#${selected.number}` : "尚未选择"}</span>
          </div>

          {!selected && (
            <div className="page-empty mt-5">
              <div>
                <SearchCheck size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                <div className="mt-2 text-sm font-medium text-body">尚未选择 PR</div>
                <div className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-mute">从左侧选择一个 PR，Agent 会生成摘要、风险点与 Review Checklist。</div>
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-hair bg-panel p-4">
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
              <PrimaryButton onClick={analyze} disabled={!selected}>生成 PR 分析</PrimaryButton>
              {analysis && <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{analysis}</pre>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

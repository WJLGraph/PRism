"use client";

import { useEffect, useState } from "react";
import { ListTodo, SearchCheck } from "lucide-react";

import { GhostButton, PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";

type Issue = { id: string; number: number; title: string; state: string; labels: string[]; body?: string };

export default function IssuesPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [selected, setSelected] = useState<Issue | null>(null);
  const [analysis, setAnalysis] = useState("");

  useEffect(() => {
    apiGet<Repository[]>("/api/repos").then((repos) => {
      if (repos[0]) {
        apiGet<Issue[]>(`/api/repos/${repos[0].id}/issues`).then((items) => {
          setIssues(items);
          setSelected(items[0] ?? null);
        });
      }
    });
  }, []);

  async function analyze() {
    if (!selected) return;
    const data = await apiPost(`/api/issues/${selected.id}/analyze`, {});
    setAnalysis(JSON.stringify(data, null, 2));
  }

  return (
    <>
      <PageTitle eyebrow="08 / Issue triage" title="Issue 智能分析" description="自动生成 Issue 分类、优先级、复杂度、负责人建议、相似问题和下一步行动项。" />
      <div className="page-grid grid-cols-[380px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Queue / 01</div>
              <h2 className="page-section-title">Issue 列表</h2>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-mute">{issues.length} 条</span>
          </div>
          <div className="mt-4 space-y-2">
            {issues.map((issue) => (
              <GhostButton key={issue.id} onClick={() => setSelected(issue)} className={`w-full ${selected?.id === issue.id ? "border-prism/40 bg-teal-50 text-prism" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0 font-mono text-[11px] text-mute">#{issue.number}</span>
                  <span className="min-w-0 flex-1 text-left">{issue.title}</span>
                  <span className="shrink-0 rounded-full border border-hair bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-mute">{issue.state}</span>
                </div>
              </GhostButton>
            ))}
            {issues.length === 0 && (
              <div className="page-empty">
                <div>
                  <ListTodo size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                  <div className="mt-2 text-sm font-medium text-body">暂无 Issue</div>
                  <div className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-mute">先在「仓库管理」连接并同步仓库，Issue 会自动出现在这里。</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="page-column">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Insight / 02</div>
              <h2 className="page-section-title">分析结果</h2>
            </div>
            <span className="font-mono text-xs text-mute">{selected ? `#${selected.number}` : "尚未选择"}</span>
          </div>

          {!selected && (
            <div className="page-empty mt-5">
              <div>
                <SearchCheck size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                <div className="mt-2 text-sm font-medium text-body">尚未选择 Issue</div>
                <div className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-mute">从左侧列表选择一个 Issue，Agent 会生成分类、优先级与行动建议。</div>
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-hair bg-panel p-4 text-sm leading-7 text-body">
                <div className="font-medium text-ink"><span className="font-mono text-xs text-prism">#{selected.number}</span> {selected.title}</div>
                <div className="mt-1">{selected.body || "暂无正文"}</div>
              </div>
              <PrimaryButton onClick={analyze} disabled={!selected}>分析当前 Issue</PrimaryButton>
              {analysis && <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{analysis}</pre>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

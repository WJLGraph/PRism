"use client";

import { useEffect, useState } from "react";
import { ListTodo, SearchCheck } from "lucide-react";

import { Card, GhostButton, PageTitle, PrimaryButton } from "@/components/ui/card";
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
      <PageTitle title="Issue 智能分析" description="自动生成 Issue 分类、优先级、复杂度、负责人建议、相似问题和下一步行动项。" />
      <div className="animate-fade-up grid gap-5 lg:grid-cols-[380px_1fr] lg:h-[calc(100vh-8rem)]">
        <Card className="animate-fade-up stagger-1 flex min-h-0 flex-col">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">Issue 列表</h2>
            <span className="rounded-full border border-hair bg-panel px-2.5 py-1 font-mono text-xs tabular-nums text-mute">{issues.length} 条</span>
          </div>
          <div className="spectrum-rule mt-2.5 w-10" />
          <div className="mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {issues.map((issue) => (
              <GhostButton key={issue.id} onClick={() => setSelected(issue)} className={selected?.id === issue.id ? "border-prism/40 bg-teal-50 text-prism" : ""}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[11px] text-mute">#{issue.number}</span>
                  <span className="min-w-0 flex-1">{issue.title}</span>
                  <span className="shrink-0 rounded-full border border-hair bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-mute">{issue.state}</span>
                </div>
              </GhostButton>
            ))}
            {issues.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-10 text-center">
                <ListTodo size={22} strokeWidth={1.6} className="text-dim" />
                <div className="text-sm font-medium text-body">暂无 Issue</div>
                <div className="max-w-[240px] text-xs leading-5 text-mute">先在「仓库管理」连接并同步仓库，Issue 会自动出现在这里。</div>
              </div>
            )}
          </div>
        </Card>

        <Card className="animate-fade-up stagger-2 flex min-h-0 flex-col">
          <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">分析结果</h2>
          <div className="spectrum-rule mt-2.5 w-10" />
          {selected && (
            <div className="mt-4 rounded-xl border border-hair bg-panel p-4 text-sm leading-7 text-body">
              <div className="font-medium text-ink"><span className="font-mono text-xs text-prism">#{selected.number}</span> {selected.title}</div>
              <div className="mt-1">{selected.body || "暂无正文"}</div>
            </div>
          )}
          {!selected && (
            <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-10 text-center">
              <SearchCheck size={22} strokeWidth={1.6} className="text-dim" />
              <div className="text-sm font-medium text-body">尚未选择 Issue</div>
              <div className="max-w-[260px] text-xs leading-5 text-mute">从左侧列表选择一个 Issue，Agent 会生成分类、优先级与行动建议。</div>
            </div>
          )}
          <PrimaryButton onClick={analyze} disabled={!selected} className="mt-5">分析当前 Issue</PrimaryButton>
          {analysis && <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{analysis}</pre>}
        </Card>
      </div>
    </>
  );
}

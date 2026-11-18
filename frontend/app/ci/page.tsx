"use client";

import { useEffect, useState } from "react";
import { SearchCheck, Workflow } from "lucide-react";

import { GhostButton, PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiGet, apiPost } from "@/lib/api";
import type { Repository } from "@/lib/types";

type WorkflowRun = {
  id: string;
  name: string;
  status: string;
  conclusion?: string | null;
  logs_text?: string | null;
  jobs?: Array<{ name?: string; conclusion?: string; steps?: Array<{ name?: string; conclusion?: string }> }>;
};

export default function CIPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selected, setSelected] = useState<WorkflowRun | null>(null);
  const [analysis, setAnalysis] = useState("");

  useEffect(() => {
    apiGet<Repository[]>("/api/repos").then((repos) => {
      if (repos[0]) {
        apiGet<WorkflowRun[]>(`/api/repos/${repos[0].id}/workflow-runs`).then((items) => {
          setRuns(items);
          setSelected(items.find((item) => item.conclusion === "failure") ?? items[0] ?? null);
        });
      }
    });
  }, []);

  async function analyze() {
    if (!selected) return;
    const data = await apiPost(`/api/workflow-runs/${selected.id}/analyze`, {});
    setAnalysis(JSON.stringify(data, null, 2));
  }

  return (
    <>
      <PageTitle eyebrow="07 / CI debug" title="CI Debug 分析" description="聚合 GitHub Actions 运行状态和失败日志，生成失败归因、排查步骤和相关风险提示。" />
      <div className="page-grid grid-cols-[380px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Runs / 01</div>
              <h2 className="page-section-title">Workflow Runs</h2>
            </div>
            <span className="font-mono text-[11px] tabular-nums text-mute">{runs.length} 次</span>
          </div>
          <div className="mt-4 space-y-2">
            {runs.map((run) => (
              <GhostButton key={run.id} onClick={() => setSelected(run)} className={`w-full ${selected?.id === run.id ? "border-prism/40 bg-teal-50 text-prism" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 break-words text-left">{run.name}</span>
                  <span className={`shrink-0 ${run.conclusion === "failure" ? "text-honey" : "text-mint"}`}>{run.conclusion ?? run.status}</span>
                </div>
              </GhostButton>
            ))}
            {runs.length === 0 && (
              <div className="page-empty">
                <div>
                  <Workflow size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                  <div className="mt-2 text-sm font-medium text-body">暂无 Workflow Run</div>
                  <div className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-mute">先在「仓库管理」连接并同步仓库，CI 运行记录会自动出现在这里。</div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="page-column">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Diagnosis / 02</div>
              <h2 className="page-section-title">排查建议</h2>
            </div>
            <span className="font-mono text-xs text-mute">{selected ? selected.name : "尚未选择"}</span>
          </div>

          {!selected && (
            <div className="page-empty mt-5">
              <div>
                <SearchCheck size={22} strokeWidth={1.6} className="mx-auto text-dim" />
                <div className="mt-2 text-sm font-medium text-body">尚未选择运行记录</div>
                <div className="mx-auto mt-1 max-w-[260px] text-xs leading-5 text-mute">从左侧选择一次 CI 运行，Agent 会生成失败归因与排查步骤。</div>
              </div>
            </div>
          )}

          {selected && (
            <div className="mt-5 space-y-4">
              {(selected.jobs?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-hair bg-panel p-4 text-xs leading-6 text-body">
                  <div className="mono-eyebrow mb-2">失败 Job</div>
                  {(selected.jobs ?? [])
                    .filter((job) => job.conclusion === "failure")
                    .map((job) => (
                      <div key={job.name} className="mt-2">
                        <span className="font-mono font-medium text-ink">{job.name}</span>
                        {job.steps?.filter((step) => step.conclusion === "failure").map((step) => (
                          <span key={step.name} className="ml-2 rounded-full border border-honey/25 bg-honey/10 px-2 py-0.5 font-mono text-[11px] text-honey">
                            {step.name}
                          </span>
                        ))}
                      </div>
                    ))}
                </div>
              )}
              {selected.logs_text && <pre className="max-h-44 overflow-auto rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-body">{selected.logs_text}</pre>}
              <PrimaryButton onClick={analyze} disabled={!selected}>分析失败原因</PrimaryButton>
              {analysis && <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{analysis}</pre>}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

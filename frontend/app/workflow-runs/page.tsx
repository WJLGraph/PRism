"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, GitBranch, Workflow } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { apiGet } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { PageTitle } from "@/components/ui/card";
import { AppSelect } from "@/components/ui/select";

type WorkflowTask = {
  id: string;
  task_id: string;
  agent_name: string;
  task_type: string;
  status: string;
  summary: string;
  error?: string | null;
};

type WorkflowRun = {
  id: string;
  repo_id?: string | null;
  goal: string;
  status: string;
  spec: { workflow_id?: string; tasks?: Array<{ id: string; dependencies?: string[] }> };
  observation: { status?: string; confidence?: number; findings?: Array<{ severity?: string; message?: string }> };
  final_answer: string;
  metrics: Record<string, number | string>;
  created_at?: string | null;
  completed_at?: string | null;
  tasks: WorkflowTask[];
};

const statusLabel: Record<string, string> = {
  success: "运行成功",
  completed: "运行成功",
  failed: "运行失败",
  running: "运行中"
};

export default function WorkflowRunsPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState("");
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Repository[]>("/api/repos")
      .then((items) => {
        setRepos(items);
        setRepoId(items[0]?.id || "");
      })
      .catch(() => setRepos([]));
  }, []);

  useEffect(() => {
    if (!repoId) return;
    setLoading(true);
    apiGet<WorkflowRun[]>(`/api/chat/workflow-runs?repo_id=${repoId}`)
      .then((items) => {
        setRuns(items);
        setSelectedId((current) => (items.some((item) => item.id === current) ? current : items[0]?.id || ""));
      })
      .finally(() => setLoading(false));
  }, [repoId]);

  const selected = useMemo(() => runs.find((item) => item.id === selectedId) ?? runs[0], [runs, selectedId]);
  const completedTasks = selected?.tasks.filter((task) => task.status === "success" || task.status === "completed").length ?? 0;
  const findings = selected?.observation.findings ?? [];

  return (
    <>
      <PageTitle title="工作流运行记录" description="按一次工程目标查看 Planner 任务图、各 Agent 执行结果、Observer 发现和最终综合结论。" />

      <section className="animate-fade-up stagger-1 grid gap-5 border-y border-hair bg-surface px-5 py-5 sm:grid-cols-2 md:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(120px,1fr))]">
        <label className="text-sm font-medium text-body">
          仓库
          <AppSelect
            className="mt-2 w-full"
            value={repoId}
            onChange={setRepoId}
            options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
          />
        </label>
        <Metric icon={Workflow} label="工作流" value={runs.length} />
        <Metric icon={CheckCircle2} label="完成任务" value={completedTasks} />
        <Metric icon={AlertTriangle} label="Observer 发现" value={findings.length} />
      </section>

      <div className="mt-5 grid min-h-[560px] gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:h-[calc(100vh-13.5rem)] lg:min-h-0">
        <aside className="animate-fade-up stagger-2 flex min-h-0 flex-col border-r border-hair bg-surface pr-5">
          <div className="mono-eyebrow mb-4">运行列表</div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {runs.map((run) => (
              <button key={run.id} onClick={() => setSelectedId(run.id)} className={`w-full rounded-xl border px-3.5 py-3 text-left transition-all duration-500 ease-silk ${selected?.id === run.id ? "border-prism/40 bg-teal-50 shadow-card" : "border-hair bg-surface hover:border-prism/30 hover:bg-panel"}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${run.status === "completed" ? "bg-mint" : run.status === "failed" ? "bg-blush" : "bg-honey"}`} />
                  <div className="min-w-0 flex-1 break-words text-sm font-medium leading-5 text-ink">{run.goal}</div>
                </div>
                <div className="mt-1.5 flex items-center justify-between pl-4 text-[11px] text-mute">
                  <span>{statusLabel[run.status] || run.status}</span>
                  <span className="font-mono">{run.created_at ? new Date(run.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </button>
            ))}
            {!loading && runs.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/60 px-4 py-8 text-center">
                <Workflow size={22} strokeWidth={1.6} className="text-dim" />
                <div className="text-sm font-medium text-body">暂无工作流运行记录</div>
                <div className="max-w-xs text-xs leading-5 text-mute">
                  到「工作台」发起一次 Issue 分析或 PR 审查，运行轨迹会自动出现在这里。
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="min-w-0">
          {selected ? (
            <div className="space-y-6">
              <section className="animate-fade-up stagger-2 border-b border-hair pb-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-prism px-3 py-1 text-xs font-semibold text-white shadow-lift">{statusLabel[selected.status] || selected.status}</span>
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-mute"><GitBranch className="h-3.5 w-3.5 text-prism" />{selected.spec.workflow_id || selected.id.slice(0, 8)}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-mute"><Database className="h-3.5 w-3.5 text-mint" />已持久化</span>
                </div>
                <h2 className="mt-4 break-words font-display text-lg font-semibold leading-relaxed tracking-tight2 text-ink">{selected.goal}</h2>
              </section>

              <section className="animate-fade-up stagger-3">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="mono-eyebrow">Agent 执行链</h3>
                  <span className="font-mono text-xs text-mute">{completedTasks}/{selected.tasks.length} 完成</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {selected.tasks.map((task, index) => (
                    <div key={task.id} className="relative rounded-xl border border-hair bg-surface p-4 shadow-card card-lift hover:border-prism/30">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 font-mono text-xs font-semibold tabular-nums text-prism">{index + 1}</span>
                        {task.status && /complet|succe/.test(task.status) ? <CheckCircle2 className="h-4 w-4 text-mint" /> : <Clock3 className="h-4 w-4 text-honey" />}
                      </div>
                      <div className="mt-3 font-mono text-sm font-semibold text-ink">{task.agent_name}</div>
                      <div className="mono-eyebrow mt-1">{task.task_type}</div>
                      <p className="mt-3 break-words text-xs leading-5 text-body">{task.summary || "任务已完成"}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="animate-fade-up stagger-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)]">
                <div className="min-w-0 overflow-hidden rounded-xl border border-teal-200 bg-teal-50/70 p-5 shadow-card">
                  <div className="mono-eyebrow mb-2 flex items-center gap-2 !text-prism"><Workflow className="h-4 w-4" />Synthesis · 最终结论</div>
                  <div className="markdown-body mt-2 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.final_answer || "暂无结论"}</ReactMarkdown>
                  </div>
                </div>
                <div className="min-w-0 overflow-hidden rounded-xl border border-honey/25 bg-panel p-5 shadow-card">
                  <div className="flex items-center justify-between gap-2 text-sm font-semibold text-honey">
                    <span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Observer 交叉检查</span>
                    {typeof selected.observation.confidence === "number" && <span className="font-mono text-xs tabular-nums">置信度 {Math.round(selected.observation.confidence * 100)}%</span>}
                  </div>
                  <div className="mt-3 space-y-2">
                    {findings.length ? (
                      findings.map((finding, index) => <div key={index} className="text-sm leading-6 text-body">{finding.message}</div>)
                    ) : (
                      <div className="rounded-xl border border-dashed border-hair bg-surface/60 px-3 py-4 text-center text-xs text-honey/80">
                        未发现跨 Agent 结论冲突或风险信号，本次运行无需人工仲裁。
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <div className="flex items-center gap-2 border-t border-hair pt-4 text-xs text-mute">
                <Clock3 className="h-3.5 w-3.5 text-dim" />
                创建于 {selected.created_at ? new Date(selected.created_at).toLocaleString("zh-CN") : "未知"}，完成后写入 workflow 与 task 两级记录。
              </div>
            </div>
          ) : <div className="text-sm text-mute">{loading ? "正在读取工作流记录..." : "请选择一条运行记录。"}</div>}
        </main>
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Workflow; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 border-l border-hair pl-4">
      <Icon className="h-5 w-5 text-prism" />
      <div className="min-w-0"><div className="mono-eyebrow">{label}</div><div className="mt-1 font-display text-2xl font-semibold tabular-nums tracking-tight2 text-ink">{value}</div></div>
    </div>
  );
}

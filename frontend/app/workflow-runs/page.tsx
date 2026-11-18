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
      <PageTitle
        eyebrow="03 / Agent execution"
        title="工作流运行记录"
        description="按一次工程目标查看 Planner 任务图、各 Agent 执行结果、Observer 发现和最终综合结论。"
      />

      <section className="page-summary-strip">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="mono-eyebrow">Repository</div>
            <AppSelect
              className="mt-2"
              value={repoId}
              onChange={setRepoId}
              options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
            />
          </div>
        </div>
        <Metric icon={Workflow} label="工作流" value={runs.length} />
        <Metric icon={CheckCircle2} label="完成任务 / Observer 发现" value={`${completedTasks} / ${findings.length}`} />
      </section>

      <div className="page-grid grid-cols-[320px_minmax(0,1fr)]">
        <aside className="page-column">
          <div className="page-kicker">Runs / 01</div>
          <h2 className="page-section-title">运行列表</h2>
          <div className="mt-5 flex flex-1 flex-col gap-2">
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                onClick={() => setSelectedId(run.id)}
                className={`w-full border px-3.5 py-3 text-left transition ${
                  selected?.id === run.id ? "border-l-2 border-l-prism border-hair bg-teal-50" : "border-hair hover:border-ink/25"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${run.status === "completed" ? "bg-mint" : run.status === "failed" ? "bg-blush" : "bg-honey"}`} />
                  <div className="min-w-0 flex-1 break-words text-sm font-medium leading-6 text-ink">{run.goal}</div>
                </div>
                <div className="mt-2 flex items-center justify-between pl-4 text-[10px] text-mute">
                  <span>{statusLabel[run.status] || run.status}</span>
                  <span className="font-mono">{run.created_at ? new Date(run.created_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
              </button>
            ))}
            {!loading && runs.length === 0 && (
              <div className="page-empty">
                <div>
                  <Workflow className="mx-auto mb-3 h-6 w-6 text-dim" />
                  暂无工作流运行记录
                  <p className="mt-2 text-xs">到「工作台」发起一次 Issue 分析或 PR 审查，运行轨迹会自动出现在这里。</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="page-column">
          {selected ? (
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`border px-3 py-1 text-xs font-medium ${selected.status === "failed" ? "border-blush/35 text-blush" : "border-mint/35 text-mint"}`}>
                  {statusLabel[selected.status] || selected.status}
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-mute"><GitBranch className="h-3.5 w-3.5 text-prism" />{selected.spec.workflow_id || selected.id.slice(0, 8)}</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-mute"><Database className="h-3.5 w-3.5 text-mint" />已持久化</span>
              </div>
              <h2 className="mt-5 max-w-5xl break-words font-display text-[clamp(1.8rem,3vw,3.15rem)] font-semibold leading-[1.08] tracking-tight2 text-ink">{selected.goal}</h2>
              <div className="mt-7 h-px bg-hair" />

              <section className="pt-7">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="page-kicker">Agent chain / 02</div>
                    <h3 className="page-section-title">执行链</h3>
                  </div>
                  <span className="font-mono text-xs text-mute">{completedTasks}/{selected.tasks.length} 完成</span>
                </div>
                <div className="mt-5 grid gap-px bg-hair md:grid-cols-2 xl:grid-cols-3">
                  {selected.tasks.map((task, index) => (
                    <article key={task.id} className="bg-surface p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] tabular-nums text-prism">{String(index + 1).padStart(2, "0")}</span>
                        {task.status && /complet|succe/.test(task.status) ? <CheckCircle2 className="h-4 w-4 text-mint" /> : <Clock3 className="h-4 w-4 text-honey" />}
                      </div>
                      <h4 className="mt-4 font-mono text-sm font-medium text-ink">{task.agent_name}</h4>
                      <div className="mono-eyebrow mt-1">{task.task_type}</div>
                      <p className="mt-3 break-words text-xs leading-6 text-body">{task.summary || "任务已完成"}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mt-8 grid gap-px bg-hair xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="bg-teal-50 p-6">
                  <div className="page-kicker">Synthesis / 03</div>
                  <h3 className="page-section-title">最终结论</h3>
                  <div className="markdown-body mt-5 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.final_answer || "暂无结论"}</ReactMarkdown>
                  </div>
                </div>
                <div className="bg-surface p-6">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="inline-flex items-center gap-2 text-sm font-medium text-honey"><AlertTriangle className="h-4 w-4" />Observer 交叉检查</h3>
                    {typeof selected.observation.confidence === "number" && <span className="font-mono text-[10px] tabular-nums text-mute">{Math.round(selected.observation.confidence * 100)}%</span>}
                  </div>
                  <div className="mt-5 space-y-3">
                    {findings.length ? (
                      findings.map((finding, index) => <div key={index} className="border-l-2 border-honey/70 pl-3 text-xs leading-6 text-body">{finding.message}</div>)
                    ) : (
                      <div className="border border-dashed border-hair px-3 py-5 text-center text-xs text-mute">未发现跨 Agent 结论冲突或风险信号。</div>
                    )}
                  </div>
                </div>
              </section>

              <div className="mt-6 flex items-center gap-2 border-t border-hair pt-4 text-xs text-mute">
                <Clock3 className="h-3.5 w-3.5 text-dim" />
                创建于 {selected.created_at ? new Date(selected.created_at).toLocaleString("zh-CN") : "未知"}，完成后写入 workflow 与 task 两级记录。
              </div>
            </div>
          ) : (
            <div className="page-empty">
              <div>
                <Workflow className="mx-auto mb-3 h-7 w-7 text-dim" />
                {loading ? "正在读取工作流记录…" : "暂无运行详情"}
                <p className="mt-2 max-w-md text-xs leading-6">在「工作台」对当前仓库发起一次工程目标，Planner 任务图、各 Agent 执行结果与综合结论会完整呈现在这里。</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Workflow; label: string; value: number | string }) {
  return (
    <div>
      <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-prism" /><div className="mono-eyebrow">{label}</div></div>
      <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-ink">{value}</div>
    </div>
  );
}

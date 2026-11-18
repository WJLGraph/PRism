"use client";

import { Bot, ListTree, Radio, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** 与后端 WorkflowSpec / 前端 WorkflowPlan 结构对齐的轻量类型 */
export type A2aPlanTask = {
  id: string;
  agent_name: string;
  task_type: string;
  objective: string;
  dependencies?: string[];
};

export type A2aPlan = {
  workflow_id: string;
  goal?: string;
  tasks: A2aPlanTask[];
};

/**
 * A2A 多智能体协作卡 —— 内嵌在聊天对话流里，数据来自后端真实编排链路：
 *  1. 主控 Agent（Planner）规划出任务图（真实 agent_name / objective / 依赖）
 *  2. 各领域 Agent（issue / pr / ci / rag / safety / repo_health…）逐个真实执行并回报
 *  3. Observer 复核 + 主控 Agent 汇总最终结论
 * 每个发言都对应一次真实的 Agent 执行结果（tool_result.answer_preview）。
 */

export type A2aAgentEvent = {
  id: string;
  kind: "task" | "observer" | "replan";
  agentName: string;
  taskType?: string;
  objective?: string;
  summary: string;
  status?: string;
};

export type A2aPhase = "planning" | "executing" | "done" | "error";

const AGENT_AVATARS = ["bg-prism text-white", "bg-teal-500 text-white", "bg-honey text-ink", "bg-mint text-ink", "bg-blush text-ink", "bg-ink text-surface"];

function avatarClass(index: number): string {
  return AGENT_AVATARS[index % AGENT_AVATARS.length];
}

const phaseLabel: Record<A2aPhase, string> = {
  planning: "主控 Agent 规划中",
  executing: "各 Agent 执行中",
  done: "协作完成",
  error: "协作中断"
};

/** 与主聊天一致的 Markdown 渲染 */
function A2aMarkdown({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children, ...props }) => (
            <div className="markdown-table-wrap">
              <table {...props}>{children}</table>
            </div>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function A2aDiscussionCard({
  question,
  plan,
  events,
  synthesis,
  phase,
  error
}: {
  question: string;
  plan?: A2aPlan;
  events: A2aAgentEvent[];
  synthesis: string;
  phase: A2aPhase;
  error?: string;
}) {
  const tasks = plan?.tasks ?? [];
  const agentCount = new Set([...tasks.map((task) => task.agent_name), ...events.map((event) => event.agentName)]).size;

  return (
    <div className="flex w-full justify-start">
      <div className="w-full rounded-lg border border-hair bg-surface">
        {/* 头部 */}
        <div className="flex flex-wrap items-center gap-2 border-b border-hair px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-prism">
            <Users className="h-3.5 w-3.5" />
            A2A 多智能体协作
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-mute">
            <Radio className={`h-3 w-3 ${phase === "planning" || phase === "executing" ? "animate-pulse text-prism" : ""}`} />
            {agentCount} agents · workflow
          </span>
          <span className="ml-auto font-mono text-[10px] text-dim">{phaseLabel[phase]}</span>
        </div>

        {/* 用户议题 */}
        <div className="border-b border-hair bg-panel px-4 py-2.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-mute">议题 / question</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink">{question}</p>
        </div>

        {/* 主控 Agent 规划 */}
        {plan && (
          <div className="border-b border-hair px-4 py-3">
            <div className="flex gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-surface">
                <ListTree className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold text-ink">主控 Agent · Planner</span>
                  <span className="rounded-full bg-panel px-1.5 py-0.5 font-mono text-[9px] text-mute">规划 {tasks.length} 项任务</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-body">{plan.goal || question}</p>
                {tasks.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {tasks.map((task) => (
                      <div key={task.id} className="rounded-md border border-line bg-panel px-2.5 py-1.5">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="rounded bg-prism px-1.5 py-0.5 font-mono text-[9px] text-white">{task.agent_name}</span>
                          <span className="text-[11px] text-body">{task.objective}</span>
                          {(task.dependencies?.length ?? 0) > 0 && (
                            <span className="font-mono text-[9px] text-dim">依赖: {task.dependencies!.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 各真实 Agent 执行发言 */}
        <div className="space-y-3 px-4 py-3">
          {phase === "planning" && events.length === 0 && !plan && (
            <div className="flex items-center gap-2 px-1 text-xs text-mute">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-prism" />
              主控 Agent 正在分析议题并规划任务...
            </div>
          )}
          {phase === "executing" && events.length === 0 && plan && (
            <div className="flex items-center gap-2 px-1 text-xs text-mute">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-prism" />
              正在调度各 Agent 执行任务...
            </div>
          )}
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-2.5">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold ${avatarClass(index)}`}>
                {event.kind === "observer" ? "Observer"[0] : event.agentName[0]?.toUpperCase() || "A"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold text-ink">{event.kind === "observer" ? "Observer 复核" : event.agentName}</span>
                  {event.taskType && (
                    <span className="rounded-full bg-panel px-1.5 py-0.5 font-mono text-[9px] text-mute">{event.taskType}</span>
                  )}
                  <span
                    className={`font-mono text-[9px] ${
                      event.status === "error" ? "text-blush" : event.status === "success" ? "text-mint" : "text-honey"
                    }`}
                  >
                    {event.status === "error" ? "failed" : event.status === "success" ? "completed" : (event.status ?? "running")}
                  </span>
                </div>
                {event.objective && <p className="mt-0.5 text-[11px] leading-5 text-dim">任务：{event.objective}</p>}
                {event.summary ? (
                  <div className="mt-1 text-sm leading-[1.8] text-body">
                    <A2aMarkdown content={event.summary} />
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-body">…</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 主控 Agent 最终汇总 */}
        {synthesis && (
          <div className="mx-4 mb-4 rounded-md border border-teal-100 bg-teal-50 px-4 py-3">
            <div className="font-mono text-[9px] uppercase tracking-[0.11em] text-prism">小组结论 / synthesis · 主控 Agent 汇总</div>
            <div className="mt-1.5 text-sm leading-[1.85] text-ink">
              <A2aMarkdown content={synthesis} />
            </div>
          </div>
        )}
        {(error || phase === "error") && (
          <div className="mx-4 mb-4 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-blush">
            协作未能完成：{error || "执行出错"}
          </div>
        )}

        {/* 协议脚注 */}
        <div className="flex items-center gap-2 border-t border-hair px-4 py-2 font-mono text-[9px] text-dim">
          <Bot className="h-3 w-3" />
          A2A 多智能体工作流 · 主控 Agent 规划 → 各领域 Agent 真实执行 → Observer 复核 → 汇总结论
        </div>
      </div>
    </div>
  );
}

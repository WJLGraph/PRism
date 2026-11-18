"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, FileText, Radio, RefreshCw, Search, Send, Square } from "lucide-react";

import {
  A2A_CARD_URL,
  A2A_ENDPOINT,
  type AgentCard,
  type A2aFrame,
  type TaskState,
  a2aCall,
  a2aStream,
  buildRpcPayload,
  ensureTrailingSlash,
  fetchAgentCard,
  frameLabel,
  friendlyA2aError,
  inspectFrame,
  shortId
} from "@/lib/a2a";

/**
 * A2A 工作台面板 —— 展示形态对齐市面 A2A 客户端（a2a-ui / 官方 A2A Inspector）：
 *  1. 连接头：Agent Card（名称/协议版本/传输/技能）+ 远端 Agent 发现
 *  2. 会话栏：contextId / taskId / 当前任务状态（真实产品顶部的 session info bar）
 *  3. 聊天流：用户消息、Agent 流式回答、任务状态行（submitted→working→…）、
 *     Artifact 可展开块、错误行 —— 全部按到达顺序内嵌在同一时间线里
 *  4. 输入区：stream/send 切换 + 终止
 *  5. 调试台：原始 JSON-RPC / SSE 帧（Inspector 的 debug console）
 */

type FeedItem =
  | { kind: "user"; id: string; text: string }
  | { kind: "agent"; id: string; text: string; pending?: boolean; state?: TaskState }
  | { kind: "status"; id: string; state: TaskState; final?: boolean; ts: number }
  | { kind: "artifact"; id: string; name: string; text: string; ts: number }
  | { kind: "error"; id: string; text: string };

const stateText: Record<TaskState, string> = {
  submitted: "text-honey",
  working: "text-prism",
  "input-required": "text-honey",
  completed: "text-mint",
  failed: "text-blush",
  canceled: "text-dim",
  unknown: "text-mute"
};

const stateDot: Record<TaskState, string> = {
  submitted: "bg-honey",
  working: "bg-prism animate-pulse",
  "input-required": "bg-honey",
  completed: "bg-mint",
  failed: "bg-blush",
  canceled: "bg-dim",
  unknown: "bg-mute"
};

function stamp(ts: number): string {
  const d = new Date(ts);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function chipClass(active: boolean): string {
  return `rounded-full px-2 py-0.5 font-mono text-[10px] ${active ? "bg-teal-50 text-prism" : "bg-panel text-mute"}`;
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq += 1)}`;

/** 追加聊天流条目并截断到最近 200 条（保持 FeedItem 字面量类型） */
function appendFeed(prev: FeedItem[], ...items: FeedItem[]): FeedItem[] {
  return [...prev, ...items].slice(-200);
}

/** 工作台头部的 A2A 在线徽标：周期探测 Agent Card，点击切到 A2A tab */
export function A2aStatusPill({ active, onClick }: { active: boolean; onClick: () => void }) {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      fetchAgentCard(A2A_CARD_URL)
        .then(() => {
          if (!cancelled) setStatus("online");
        })
        .catch(() => {
          if (!cancelled) setStatus("offline");
        });
    };
    check();
    const timer = setInterval(check, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const dot =
    status === "online" ? "bg-mint" : status === "offline" ? "bg-blush" : "bg-honey animate-pulse";
  const label = status === "online" ? "A2A 在线" : status === "offline" ? "A2A 离线" : "A2A 探测中";

  return (
    <button
      type="button"
      onClick={onClick}
      title="查看 A2A 协议工作台"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 transition ${
        active ? "border-prism bg-teal-50 text-prism" : "border-hair bg-surface text-mute hover:text-ink"
      }`}
    >
      <Radio className="h-3 w-3" />
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </button>
  );
}

export function A2aWorkspace() {
  const [card, setCard] = useState<AgentCard | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardLoading, setCardLoading] = useState(true);

  const [peerBase, setPeerBase] = useState("");
  const [peerCard, setPeerCard] = useState<AgentCard | null>(null);
  const [peerError, setPeerError] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const [mode, setMode] = useState<"message/stream" | "message/send">("message/stream");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [taskState, setTaskState] = useState<TaskState | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [frames, setFrames] = useState<A2aFrame[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<HTMLDivElement>(null);

  const loadCard = useCallback(async () => {
    setCardLoading(true);
    setCardError(null);
    try {
      setCard(await fetchAgentCard(A2A_CARD_URL));
    } catch (err) {
      setCardError(friendlyA2aError(err, true));
    } finally {
      setCardLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCard();
  }, [loadCard]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [feed]);

  useEffect(() => {
    const el = framesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [frames]);

  const pushFrame = (frame: A2aFrame) => setFrames((prev) => [...prev, frame].slice(-200));

  function resolveEndpoint(): string {
    const base = peerBase.trim() || A2A_ENDPOINT;
    if (peerCard?.url) {
      try {
        const origin = typeof window === "undefined" ? "http://127.0.0.1:8001" : window.location.origin;
        return ensureTrailingSlash(new URL(peerCard.url, origin).toString());
      } catch {
        /* 非法 url 时回退本机端点 */
      }
    }
    return A2A_ENDPOINT;
  }

  async function discover() {
    const custom = peerBase.trim();
    const base = custom || A2A_ENDPOINT;
    setDiscovering(true);
    setPeerError(null);
    try {
      setPeerCard(await fetchAgentCard(base));
    } catch (err) {
      setPeerCard(null);
      setPeerError(friendlyA2aError(err, !custom || /localhost|127\.0\.0\.1/.test(custom)));
    } finally {
      setDiscovering(false);
    }
  }

  async function run() {
    const text = input.trim();
    if (!text || running) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setInput("");

    const agentId = nextId("agent");
    const context = contextId ?? nextId("ctx");
    setContextId(context);
    setFeed((prev) =>
      appendFeed(
        prev,
        { kind: "user", id: nextId("user"), text },
        { kind: "agent", id: agentId, text: "", pending: true }
      )
    );

    const payload = buildRpcPayload(mode, text);
    pushFrame({
      ts: Date.now(),
      dir: "req",
      label: `${mode} · ${text.slice(0, 24)}${text.length > 24 ? "…" : ""}`,
      payload
    });

    const endpoint = resolveEndpoint();
    const isLocal = /localhost|127\.0\.0\.1/.test(endpoint);

    const handle = (parsed: unknown, raw: string) => {
      if (parsed === undefined || parsed === null) {
        pushFrame({ ts: Date.now(), dir: "res", label: "raw · 非 JSON 帧", payload: raw });
        return;
      }
      const insight = inspectFrame(parsed);
      pushFrame({
        ts: Date.now(),
        dir: "res",
        label: frameLabel(insight),
        state: insight.state,
        final: insight.final,
        error: insight.error,
        payload: parsed
      });

      if (insight.taskId) setTaskId(insight.taskId);
      if (insight.contextId) setContextId(insight.contextId);

      if (insight.kind === "error") {
        setFeed((prev) => appendFeed(prev, { kind: "error", id: nextId("err"), text: insight.error ?? "A2A 返回错误帧" }));
        return;
      }

      const now = Date.now();
      const terminal = Boolean(
        insight.final ||
          (insight.state && ["completed", "failed", "canceled", "input-required"].includes(insight.state))
      );

      // 任务状态行：与消息同时间线内嵌，连续重复状态去重
      if (insight.state) {
        setTaskState(insight.state);
        setFeed((prev) => {
          const last = [...prev].reverse().find((item) => item.kind === "status");
          if (last && last.kind === "status" && last.state === insight.state && last.final === insight.final) return prev;
          return appendFeed(prev, { kind: "status", id: nextId("st"), state: insight.state as TaskState, final: insight.final, ts: now });
        });
      }

      // Artifact：命名产物，聊天流内可展开块（同名上移更新）
      if (insight.artifactText) {
        const name = insight.artifactName ?? "artifact";
        setFeed((prev) => {
          const index = prev.findIndex((item) => item.kind === "artifact" && item.name === name);
          if (index >= 0) {
            const next = [...prev];
            next[index] = { kind: "artifact", id: next[index].id, name, text: insight.artifactText as string, ts: now };
            return next;
          }
          return appendFeed(prev, { kind: "artifact", id: nextId("art"), name, text: insight.artifactText as string, ts: now });
        });
      }

      // Agent 气泡：stream 增量追加；message 覆盖为全文；artifact 全文只进产物块不重复
      const incoming = insight.kind === "artifact-update" || insight.kind === "task" ? undefined : insight.text;
      if (incoming) {
        setFeed((prev) =>
          prev.map((item) => {
            if (item.kind !== "agent" || item.id !== agentId) return item;
            const append = insight.kind === "status-update" && !insight.artifactText;
            const merged = append && item.text ? `${item.text}${item.text.endsWith("\n") ? "" : "\n"}${incoming}` : incoming;
            return { ...item, text: merged, state: insight.state ?? item.state, pending: terminal ? false : item.pending };
          })
        );
      } else if (terminal) {
        setFeed((prev) =>
          prev.map((item) =>
            item.kind === "agent" && item.id === agentId
              ? { ...item, pending: false, state: insight.state ?? item.state }
              : item
          )
        );
      }
    };

    try {
      if (mode === "message/stream") {
        await a2aStream(endpoint, payload, handle, controller.signal);
      } else {
        const response = await a2aCall(endpoint, payload, controller.signal);
        handle(response, JSON.stringify(response));
      }
    } catch (err) {
      const message = friendlyA2aError(err, isLocal);
      if (!/abort/i.test(message)) {
        setFeed((prev) => appendFeed(prev, { kind: "error", id: nextId("err"), text: message }));
        pushFrame({ ts: Date.now(), dir: "res", label: "error · 请求失败", error: message, payload: message });
      } else {
        setFeed((prev) => appendFeed(prev, { kind: "status", id: nextId("st"), state: "canceled", ts: Date.now() }));
        setTaskState("canceled");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
      setFeed((prev) => prev.map((item) => (item.kind === "agent" && item.id === agentId ? { ...item, pending: false } : item)));
    }
  }

  function resetSession() {
    setFeed([]);
    setFrames([]);
    setTaskState(null);
    setTaskId(null);
    setContextId(null);
  }

  const endpoint = resolveEndpoint();

  return (
    <div className="mt-4 space-y-4">
      {/* 1. 连接头：Agent Card + 远端发现 */}
      <section className="rounded-md border border-line bg-surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-teal-50 text-accent">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="text-sm font-semibold text-ink">{card?.name ?? "本机 Agent"}</h3>
                <span className={chipClass(true)}>v{card?.version ?? "?"}</span>
                <span className={chipClass(true)}>A2A {card?.protocolVersion ?? "?"}</span>
                <span className={chipClass(Boolean(card?.capabilities?.streaming))}>
                  {card?.capabilities?.streaming ? "SSE stream" : "JSONRPC"}
                </span>
              </div>
              <p className="mt-1 break-words text-xs leading-5 text-mute">
                {cardLoading ? "正在读取 Agent Card..." : card?.description ?? cardError ?? "Agent Card 不可用"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadCard()}
            className="icon-button shrink-0 disabled:opacity-45"
            disabled={cardLoading}
            title="刷新 Agent Card"
            aria-label="刷新 Agent Card"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cardLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {(card?.skills?.length ?? 0) > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {card!.skills!.map((skill, index) => (
              <span key={skill.id ?? skill.name ?? index} className="rounded-full border border-hair px-2 py-0.5 text-[10px] text-body">
                {skill.name ?? skill.id ?? `skill-${index + 1}`}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">远端</span>
          <input
            value={peerBase}
            onChange={(event) => setPeerBase(event.target.value)}
            placeholder="http://127.0.0.1:8000"
            className="h-8 min-w-0 flex-1 rounded-md border border-line bg-surface px-2.5 font-mono text-[11px] outline-none focus:border-teal-500"
          />
          <button
            type="button"
            onClick={() => void discover()}
            disabled={discovering}
            className="inline-flex h-8 shrink-0 items-center gap-1 rounded-md border border-line px-2.5 text-[11px] font-medium text-body transition hover:bg-panel disabled:opacity-60"
          >
            <Search className={`h-3 w-3 ${discovering ? "animate-spin" : ""}`} />
            {discovering ? "发现中" : "发现"}
          </button>
        </div>
        {peerCard && (
          <div className="mt-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-prism">
              <Radio className="h-3.5 w-3.5" />
              {peerCard.name ?? "远端 Agent"}
              <span className="font-mono text-[10px] text-mute">v{peerCard.version ?? "?"}</span>
              <span className="ml-auto font-mono text-[10px] text-mute">{endpoint}</span>
            </div>
          </div>
        )}
        {cardError && <p className="mt-2 text-xs leading-5 text-blush">{cardError}</p>}
        {peerError && <p className="mt-2 text-xs leading-5 text-blush">{peerError}</p>}
      </section>

      {/* 2. 会话栏：contextId / taskId / 状态（session info bar） */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-hair bg-panel px-3 py-2">
        <Radio className={`h-3.5 w-3.5 shrink-0 ${running ? "animate-pulse text-prism" : "text-mute"}`} />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-mute">session</span>
        {contextId ? (
          <span className={chipClass(true)}>ctx {shortId(contextId)}</span>
        ) : (
          <span className={chipClass(false)}>ctx 新会话</span>
        )}
        {taskId && <span className={chipClass(true)}>task {shortId(taskId)}</span>}
        {taskState && (
          <span className={`inline-flex items-center gap-1.5 rounded-full border border-hair bg-surface px-2 py-0.5 text-[11px] font-medium ${stateText[taskState]}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${stateDot[taskState]}`} />
            {taskState}
          </span>
        )}
        {running && <span className="font-mono text-[10px] text-prism">● streaming</span>}
        {feed.length > 0 && !running && (
          <button type="button" onClick={resetSession} className="ml-auto text-[11px] text-mute transition hover:text-ink">
            新会话
          </button>
        )}
      </div>

      {/* 3. 聊天流：消息 / 状态行 / Artifact 块 同一时间线 */}
      <div ref={feedRef} className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
        {feed.length === 0 && (
          <div className="rounded-md border border-dashed border-hair bg-surface p-4 text-xs leading-5 text-mute">
            发送一条消息，这里会按 A2A 协议时间线展示：用户消息 → task 状态流转（submitted → working → …）→
            Agent 流式回答 → Artifact 产物块。
          </div>
        )}
        {feed.map((item) => {
          if (item.kind === "user") {
            return (
              <div key={item.id} className="flex justify-end">
                <div className="max-w-[92%] rounded-lg bg-teal-50 px-3 py-2">
                  <div className="font-mono text-[9px] uppercase tracking-[0.1em] text-prism">user · message/send</div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-body">{item.text}</p>
                </div>
              </div>
            );
          }
          if (item.kind === "agent") {
            return (
              <div key={item.id} className="flex justify-start">
                <div className="max-w-[92%] rounded-lg border border-line bg-panel px-3 py-2">
                  <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.1em] text-mute">
                    <Bot className="h-3 w-3" />
                    agent
                    {item.state && <span className={stateText[item.state]}>{item.state}</span>}
                    {item.pending && <span className="text-prism">● streaming</span>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-body">
                    {item.text || (item.pending ? "…" : "（本帧无文本，见下方 artifact）")}
                  </p>
                </div>
              </div>
            );
          }
          if (item.kind === "status") {
            return (
              <div key={item.id} className="flex items-center gap-2 px-1 font-mono text-[10px] text-mute">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${stateDot[item.state]}`} />
                <span className={stateText[item.state]}>{item.state}</span>
                <span>task status-update</span>
                {item.final && <span className="rounded-full bg-teal-50 px-1.5 text-[9px] text-prism">final</span>}
                <span className="ml-auto text-dim">{stamp(item.ts)}</span>
              </div>
            );
          }
          if (item.kind === "artifact") {
            return (
              <details key={item.id} className="rounded-md border border-line bg-surface">
                <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-prism" />
                  <span className="font-medium text-ink">{item.name}</span>
                  <span className="rounded-full bg-teal-50 px-1.5 py-0.5 font-mono text-[9px] text-prism">artifact</span>
                  <span className="ml-auto font-mono text-[10px] text-dim">{stamp(item.ts)}</span>
                </summary>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all border-t border-hair px-3 py-2 text-xs leading-5 text-body">
                  {item.text}
                </pre>
              </details>
            );
          }
          return (
            <div key={item.id} className="rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-xs leading-5 text-blush">
              {item.text}
            </div>
          );
        })}
      </div>

      {/* 4. 输入区 */}
      <section className="rounded-md border border-line bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[10px] text-mute">POST {endpoint}</span>
          <div className="grid grid-cols-2 gap-1 rounded-md border border-hair p-0.5">
            {(["message/stream", "message/send"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded px-2 py-1 font-mono text-[10px] transition ${
                  mode === value ? "bg-ink text-surface" : "text-mute hover:text-ink"
                }`}
              >
                {value === "message/stream" ? "stream · SSE" : "send · 阻塞"}
              </button>
            ))}
          </div>
        </div>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void run();
          }}
          placeholder="给 Agent 派一个任务（Ctrl/⌘ + Enter 发送）"
          className="mt-2 min-h-16 w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm leading-6 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void run()}
            disabled={running || !input.trim()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-4 text-xs font-medium text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            <Send className="h-3.5 w-3.5" />
            {running ? "任务执行中..." : "发送任务"}
          </button>
          {running && (
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-xs font-medium text-mute transition hover:bg-panel"
            >
              <Square className="h-3.5 w-3.5" />
              停止
            </button>
          )}
        </div>
      </section>

      {/* 5. 调试台：原始 JSON-RPC / SSE 帧 */}
      <details open className="rounded-md border border-line bg-surface">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold text-ink">
          调试台 · JSON-RPC / SSE
          <span className="rounded-full bg-panel px-2 py-0.5 font-mono text-[10px] text-mute">{frames.length} 帧</span>
        </summary>
        <div ref={framesRef} className="max-h-52 space-y-1.5 overflow-y-auto border-t border-hair p-3">
          {frames.length === 0 && (
            <div className="rounded-md bg-panel p-3 text-xs leading-5 text-mute">
              每一帧请求 / SSE 响应都会实时落在这里，点击可展开原始报文。
            </div>
          )}
          {frames.map((frame, index) => (
            <details
              key={`${frame.ts}-${index}`}
              className={`rounded-md border border-l-2 border-line bg-panel px-2.5 py-1.5 ${
                frame.dir === "req" ? "border-l-prism" : frame.error ? "border-l-blush" : "border-l-mint"
              }`}
            >
              <summary className="flex cursor-pointer items-center gap-2 text-[11px]">
                <span
                  className={`shrink-0 rounded px-1 font-mono text-[9px] ${
                    frame.dir === "req" ? "bg-teal-50 text-prism" : "bg-panel text-mint"
                  }`}
                >
                  {frame.dir === "req" ? "REQ" : "SSE"}
                </span>
                <span className="min-w-0 truncate text-body">{frame.label}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-dim">{stamp(frame.ts)}</span>
              </summary>
              <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-4 text-mute">
                {typeof frame.payload === "string" ? frame.payload : JSON.stringify(frame.payload, null, 2)}
              </pre>
            </details>
          ))}
        </div>
      </details>
    </div>
  );
}

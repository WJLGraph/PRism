/**
 * A2A 协议客户端：JSON-RPC 组帧 + message/send 响应 + message/stream SSE 解析。
 *
 * wire 格式以本机 /a2a 真机冒烟为准（a2a-sdk 0.3）：
 *  - RPC 入口必须带尾斜杠 `POST /a2a/`，缺斜杠会 307 跳转
 *  - `message/send` 返回单个 JSON-RPC 响应，result 为 task（含 artifacts/history）或 message
 *  - `message/stream` 返回 `data:` 行包裹的 JSON-RPC 帧，result.kind ∈
 *    status-update | artifact-update | task | message；status.message 的 parts 是增量文本
 */

import { API_BASE_URL } from "./api";

export const A2A_ENDPOINT = `${API_BASE_URL}/a2a/`;
export const A2A_CARD_URL = `${API_BASE_URL}/a2a/.well-known/agent-card.json`;

export interface AgentSkill {
  id?: string;
  name?: string;
  description?: string;
  tags?: string[];
  examples?: string[];
}

export interface AgentCard {
  name?: string;
  description?: string;
  url?: string;
  version?: string;
  protocolVersion?: string;
  preferredTransport?: string;
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  skills?: AgentSkill[];
}

export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled"
  | "unknown";

export interface A2aFrame {
  ts: number;
  dir: "req" | "res";
  label: string;
  state?: TaskState;
  final?: boolean;
  error?: string;
  payload: unknown;
}

export interface FrameInsight {
  kind: "status-update" | "artifact-update" | "task" | "message" | "error" | "unknown";
  state?: TaskState;
  final?: boolean;
  /** status.message / message 携带的文本（stream 模式下是增量块） */
  text?: string;
  /** task.artifacts 或 artifact-update.artifact 的全文 */
  artifactText?: string;
  artifactName?: string;
  error?: string;
  taskId?: string;
  contextId?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `a2a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function asTaskState(value: unknown): TaskState | undefined {
  if (typeof value !== "string") return undefined;
  const known: TaskState[] = ["submitted", "working", "input-required", "completed", "failed", "canceled"];
  return (known as string[]).includes(value) ? (value as TaskState) : "unknown";
}

export function ensureTrailingSlash(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/** 组一帧 A2A message/send|stream 请求（spec 0.3：params.message.role/parts） */
export function buildRpcPayload(method: "message/send" | "message/stream", text: string) {
  return {
    jsonrpc: "2.0",
    id: randomId(),
    method,
    params: {
      message: {
        messageId: randomId(),
        role: "user",
        parts: [{ type: "text", text }]
      }
    }
  };
}

export function partsText(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .filter(isRecord)
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function messageText(message: unknown): string {
  if (!isRecord(message)) return "";
  return partsText(message.parts);
}

function taskText(task: Record<string, unknown>): string {
  const artifacts = Array.isArray(task.artifacts) ? task.artifacts : [];
  const texts: string[] = [];
  for (const artifact of artifacts) {
    if (!isRecord(artifact)) continue;
    const text = partsText(artifact.parts);
    if (text) texts.push(text);
  }
  return texts.join("\n\n").trim();
}

/** 防御性解析：JSON-RPC 错误 / message / task / status-update / artifact-update 一帧读懂 */
export function inspectFrame(payload: unknown): FrameInsight {
  if (!isRecord(payload)) return { kind: "unknown" };

  if (isRecord(payload.error)) {
    const code = typeof payload.error.code === "number" ? payload.error.code : undefined;
    const message = typeof payload.error.message === "string" ? payload.error.message : "未知 JSON-RPC 错误";
    return { kind: "error", error: code !== undefined ? `A2A ${code}: ${message}` : message };
  }

  const result = isRecord(payload.result) ? payload.result : payload;
  const kind = typeof result.kind === "string" ? result.kind : "";
  const ids = {
    taskId: typeof result.taskId === "string" ? result.taskId : undefined,
    contextId: typeof result.contextId === "string" ? result.contextId : undefined
  };

  if (kind === "message") {
    return { kind: "message", text: messageText(result), ...ids };
  }

  if (kind === "task") {
    const status = isRecord(result.status) ? result.status : {};
    return {
      kind: "task",
      state: asTaskState(status.state) ?? "unknown",
      text: messageText(status.message) || undefined,
      artifactText: taskText(result) || undefined,
      ...ids
    };
  }

  if (kind === "status-update") {
    const status = isRecord(result.status) ? result.status : {};
    return {
      kind: "status-update",
      state: asTaskState(status.state) ?? "unknown",
      final: result.final === true,
      text: messageText(status.message) || undefined,
      ...ids
    };
  }

  if (kind === "artifact-update") {
    const artifact = isRecord(result.artifact) ? result.artifact : {};
    return {
      kind: "artifact-update",
      artifactName: typeof artifact.name === "string" ? artifact.name : undefined,
      artifactText: partsText(artifact.parts) || undefined,
      ...ids
    };
  }

  return { kind: "unknown", ...ids };
}

export function frameLabel(insight: FrameInsight): string {
  switch (insight.kind) {
    case "status-update":
      return `status-update · ${insight.state}${insight.final ? " · final" : ""}`;
    case "artifact-update":
      return `artifact-update · ${insight.artifactName ?? "artifact"}`;
    case "task":
      return `task · ${insight.state}`;
    case "message":
      return "message · agent 回答";
    case "error":
      return `error · ${insight.error ?? ""}`;
    default:
      return "unknown frame";
  }
}

/** 发起 message/send（阻塞式，返回单帧） */
export async function a2aCall(url: string, payload: unknown, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    signal
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

/**
 * 发起 message/stream（SSE）。
 * data: 行里是 JSON-RPC 帧；解析失败时以原始文本回调，保证帧检查器不丢包。
 */
export async function a2aStream(
  url: string,
  payload: unknown,
  onFrame: (parsed: unknown, raw: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(payload),
    signal
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  if (!response.body) throw new Error("当前浏览器不支持流式响应");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // SSE 帧间空行可能是 \n\n 或 \r\n\r\n（本项目后端用 CRLF），正则兼容两种
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      const dataLines = chunk
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      if (dataLines.length === 0) continue;
      const raw = dataLines.join("\n");
      try {
        onFrame(JSON.parse(raw), raw);
      } catch {
        onFrame(undefined, raw);
      }
    }
  }

  // 流结束：处理末尾未以空行结尾的残留帧
  if (buffer.trim()) {
    const dataLines = buffer
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    if (dataLines.length > 0) {
      const raw = dataLines.join("\n");
      try {
        onFrame(JSON.parse(raw), raw);
      } catch {
        onFrame(undefined, raw);
      }
    }
  }
}

/** 发现 Agent Card：接受 base（自动补 /.well-known/agent-card.json）或完整卡片 URL */
export async function fetchAgentCard(baseOrCardUrl: string): Promise<AgentCard> {
  const url = baseOrCardUrl.includes("agent-card.json")
    ? baseOrCardUrl
    : `${baseOrCardUrl.replace(/\/+$/, "")}/.well-known/agent-card.json`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const card = await response.json();
  if (!card || typeof card !== "object") throw new Error("Agent Card 不是 JSON 对象");
  return card as AgentCard;
}

export function shortId(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

export function friendlyA2aError(err: unknown, isLocal: boolean): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/abort/i.test(message)) return "已停止";
  if (/404|not found/i.test(message) && isLocal) {
    return `${message}（本机 A2A 未启用：在后端 .env 设置 A2A_ENABLED=true 并重启）`;
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return `${message}（跨域 CORS 或目标不可达，请确认远端 Agent 允许本站来源）`;
  }
  return message;
}

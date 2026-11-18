/**
 * 生成唯一 ID。
 * crypto.randomUUID 只在安全上下文（HTTPS / localhost）可用，
 * 通过普通 HTTP + 公网 IP 访问时它是 undefined，因此必须降级。
 */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 6)}`;
}

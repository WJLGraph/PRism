"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clock3, FileText, Send, ShieldAlert, Trash2, X } from "lucide-react";

import { apiDelete, apiGet, apiPost } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Repository } from "@/lib/types";
import { PageTitle, PrimaryButton } from "@/components/ui/card";
import { AppSelect } from "@/components/ui/select";

type ActionDraft = {
  id: string;
  repo_id: string;
  draft_type: string;
  target_type: string;
  title: string;
  content: string;
  risk_level: string;
  status: string;
  execution_result?: Record<string, unknown> | null;
  error_message?: string | null;
  created_at: string;
  executed_at?: string | null;
};

type AuditLog = { id: string; action: string; status: string; target_type?: string | null; target_id?: string | null; created_at: string };

const statusMeta: Record<string, { label: string; className: string }> = {
  pending_confirmation: { label: "等待人工确认", className: "bg-honey/10 text-honey border-honey/25" },
  executed: { label: "已确认并执行", className: "bg-mint/10 text-mint border-mint/25" },
  cancelled: { label: "已取消", className: "bg-surface-2 text-body border-hair" },
  failed: { label: "执行失败", className: "bg-blush/10 text-blush border-blush/25" }
};

export default function ActionDraftsPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState("");
  const [drafts, setDrafts] = useState<ActionDraft[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [title, setTitle] = useState("发布检查报告");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  async function load(repo = repoId) {
    const suffix = repo ? `?repo_id=${repo}` : "";
    const [draftItems, auditItems] = await Promise.all([
      apiGet<ActionDraft[]>(`/api/action-drafts${suffix}`),
      apiGet<AuditLog[]>(`/api/action-drafts/audit-logs${suffix}`).catch(() => [])
    ]);
    setDrafts(draftItems);
    setAudits(auditItems);
  }

  useEffect(() => {
    apiGet<Repository[]>("/api/repos")
      .then((items) => {
        setRepos(items);
        setRepoId(items[0]?.id || "");
        return load(items[0]?.id || "");
      })
      .catch(() => setRepos([]));
  }, []);

  async function createDraft() {
    if (!repoId || !content.trim()) return;
    setLoading(true);
    try {
      await apiPost<ActionDraft>("/api/action-drafts", {
        repo_id: repoId,
        draft_type: "send_report",
        target_type: "repository",
        title: title.trim() || "发布检查报告",
        content,
        risk_level: "medium",
        metadata: { source: "manual_review" }
      });
      setContent("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function changeDraft(id: string, action: "confirm" | "cancel") {
    setLoading(true);
    try {
      await apiPost(`/api/action-drafts/${id}/${action}`, {});
      await load();
    } finally {
      setLoading(false);
    }
  }

  const pendingCount = useMemo(() => drafts.filter((draft) => draft.status === "pending_confirmation").length, [drafts]);
  const executedCount = useMemo(() => drafts.filter((draft) => draft.status === "executed").length, [drafts]);

  return (
    <>
      <PageTitle title="安全草稿与人工确认" description="Agent 的外部写操作先落成可审查草稿；只有具备批准权限的人确认后，系统才执行并写入审计记录。" />

      <section className="animate-fade-in grid gap-5 border-y border-hair bg-surface px-4 py-5 sm:grid-cols-3">
        <Summary icon={FileText} label="全部草稿" value={drafts.length} />
        <Summary icon={Clock3} label="待确认" value={pendingCount} tone="amber" />
        <Summary icon={CheckCircle2} label="已执行" value={executedCount} tone="green" />
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="animate-fade-in stagger-1 self-start rounded-2xl border border-hair bg-surface p-5 shadow-card">
          <div className="mono-eyebrow mb-3">Compose</div>
          <div className="flex items-center gap-2 text-sm font-semibold text-ink"><ShieldAlert className="h-4 w-4 text-honey" />创建安全草稿</div>
          <p className="mt-2 text-xs leading-5 text-mute">这里只保存建议内容，不会直接写入外部系统。</p>
          <label className="mt-5 block text-sm font-medium text-body">仓库
            <AppSelect
              className="mt-2 w-full"
              value={repoId}
              onChange={(value) => { setRepoId(value); void load(value); }}
              options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
            />
          </label>
          <label className="mt-5 block text-sm font-medium text-body">标题
            <input className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow" value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="mt-5 block text-sm font-medium text-body">待审查内容
            <textarea className="mt-2 min-h-40 w-full resize-none rounded-lg border border-hair bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-prism/50 focus:shadow-glow" value={content} onChange={(event) => setContent(event.target.value)} placeholder="输入准备发送的报告或评论内容" />
          </label>
          <PrimaryButton className="mt-5 w-full gap-2" disabled={!repoId || !content.trim() || loading} onClick={createDraft}><FileText className="h-4 w-4" />保存为待确认草稿</PrimaryButton>
        </section>

        <div className="space-y-5">
          {drafts.map((draft) => {
            const meta = statusMeta[draft.status] || { label: draft.status, className: "bg-surface-2 text-body border-hair" };
            return (
              <article key={draft.id} className="animate-fade-in rounded-2xl border border-hair bg-surface p-5 shadow-card card-lift hover:border-prism/30">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-semibold tracking-tight2 text-ink">{draft.title || draft.draft_type}</h2>
                      <span className={`rounded-full border px-2.5 py-1 font-mono text-xs ${meta.className}`}>{meta.label}</span>
                      <span className={`rounded-full px-2.5 py-1 font-mono text-xs ${draft.risk_level === "high" ? "bg-blush/10 text-blush" : "bg-surface-2 text-body"}`}>{draft.risk_level === "high" ? "高风险" : "中低风险"}</span>
                    </div>
                    <div className="mt-2 font-mono text-xs text-mute">{draft.draft_type} · {draft.target_type} · {new Date(draft.created_at).toLocaleString("zh-CN")}</div>
                  </div>
                  {draft.status === "pending_confirmation" && (
                    <div className="flex gap-2">
                      <button className="inline-flex items-center gap-1 rounded-xl bg-prism px-3 py-2 text-sm font-medium text-white shadow-lift transition-all duration-500 ease-silk hover:bg-accent disabled:opacity-60" disabled={loading} onClick={() => changeDraft(draft.id, "confirm")}><Check className="h-4 w-4" />确认执行</button>
                      <button className="inline-flex items-center gap-1 rounded-xl border border-hair bg-surface px-3 py-2 text-sm text-body transition-all duration-500 ease-silk hover:border-prism/40 hover:bg-panel disabled:opacity-60" disabled={loading} onClick={() => changeDraft(draft.id, "cancel")}><X className="h-4 w-4" />取消</button>
                    </div>
                  )}
                  {draft.status !== "executed" && (
                    <button
                      className="inline-flex items-center gap-1 rounded-xl border border-blush/30 bg-surface px-3 py-2 text-sm text-blush transition-all duration-500 ease-silk hover:bg-blush/10 disabled:opacity-60"
                      disabled={loading}
                      onClick={async () => {
                        if (!window.confirm("确定删除这份草稿？删除后不可恢复。")) return;
                        setLoading(true);
                        try {
                          await apiDelete(`/api/action-drafts/${draft.id}`);
                          await load();
                        } catch (err) {
                          window.alert(err instanceof Error ? err.message : "删除失败");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />删除草稿
                    </button>
                  )}
                </div>
                <div className="markdown-body mt-4 rounded-xl border border-hair border-l-4 border-l-prism bg-panel p-4 text-sm leading-7 text-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content || "（无内容）"}</ReactMarkdown>
                </div>
                {draft.status === "executed" && <div className="mt-3 flex items-center gap-2 text-sm text-mint"><CheckCircle2 className="h-4 w-4" />人工确认完成，执行结果和操作者已经写入审计记录。</div>}
                {draft.error_message && <div className="mt-3 rounded-xl bg-blush/10 p-3 text-sm text-blush">{draft.error_message}</div>}
              </article>
            );
          })}
          {drafts.length === 0 && <div className="rounded-2xl border border-dashed border-hair bg-surface p-5 text-sm text-mute">暂无安全草稿。</div>}

          <section className="animate-fade-in stagger-2 rounded-2xl border border-hair bg-surface p-5 shadow-card">
            <div className="mono-eyebrow mb-3">Audit Trail</div>
            <div className="flex items-center gap-2 font-semibold text-ink"><Send className="h-4 w-4 text-prism" />审计时间线</div>
            <div className="mt-5 space-y-0">
              {audits.slice(0, 10).map((item, index) => (
                <div key={item.id} className="relative flex gap-3 pb-4">
                  {index < Math.min(audits.length, 10) - 1 && <span className="absolute left-[7px] top-4 h-full w-px bg-line" />}
                  <span className={`relative mt-1 h-4 w-4 shrink-0 rounded-full border-4 border-surface ${item.status === "success" ? "bg-mint" : "bg-blush"}`} />
                  <div><div className="text-sm font-medium text-ink">{auditLabel(item.action)}</div><div className="mt-1 font-mono text-xs text-mute">{item.status} · {new Date(item.created_at).toLocaleString("zh-CN")}</div></div>
                </div>
              ))}
              {audits.length === 0 && <div className="text-sm text-mute">暂无审计记录。</div>}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function Summary({ icon: Icon, label, value, tone = "teal" }: { icon: typeof FileText; label: string; value: number; tone?: "teal" | "amber" | "green" }) {
  const color = tone === "amber" ? "text-honey" : tone === "green" ? "text-mint" : "text-prism";
  return <div className="flex items-center gap-3"><Icon className={`h-5 w-5 ${color}`} /><div><div className="mono-eyebrow">{label}</div><div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</div></div></div>;
}

function auditLabel(action: string) {
  if (action.startsWith("action_draft.confirm")) return "人工确认并执行草稿";
  if (action === "action_draft.create") return "创建待确认草稿";
  if (action === "action_draft.cancel") return "取消草稿";
  return action;
}

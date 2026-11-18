"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Clock3, FileText, ShieldAlert, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { apiDelete, apiGet, apiPost } from "@/lib/api";
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
  pending_confirmation: { label: "等待人工确认", className: "border-honey/35 bg-honey/10 text-honey" },
  executed: { label: "已确认并执行", className: "border-mint/35 bg-mint/10 text-mint" },
  cancelled: { label: "已取消", className: "border-hair bg-surface-2 text-body" },
  failed: { label: "执行失败", className: "border-blush/35 bg-blush/10 text-blush" }
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
      <PageTitle
        eyebrow="02 / Human-in-the-loop"
        title="安全草稿与人工确认"
        description="Agent 的外部写操作先落成可审查草稿。只有具备批准权限的人确认后，系统才执行并写入审计记录。"
      />

      <div className="page-summary-strip">
        <Summary icon={FileText} label="全部草稿" value={drafts.length} />
        <Summary icon={Clock3} label="待确认" value={pendingCount} tone="amber" />
        <Summary icon={CheckCircle2} label="已执行" value={executedCount} tone="green" />
      </div>

      <div className="page-grid mt-0 grid-cols-[360px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="page-kicker">Compose / 01</div>
          <h2 className="page-section-title">创建安全草稿</h2>
          <p className="page-section-note">这里只保存建议内容，不会直接写入外部系统。</p>

          <label className="page-form-field mt-7">
            <span>仓库</span>
            <AppSelect
              value={repoId}
              onChange={(value) => { setRepoId(value); void load(value); }}
              options={repos.map((repo) => ({ value: repo.id, label: repo.full_name }))}
            />
          </label>
          <label className="page-form-field mt-5">
            <span>标题</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="page-form-field mt-5">
            <span>待审查内容</span>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="输入准备发送的报告或评论内容" />
          </label>
          <PrimaryButton className="mt-6 w-full" disabled={!repoId || !content.trim() || loading} onClick={createDraft}>
            <FileText className="h-4 w-4" />保存为待确认草稿
          </PrimaryButton>

          <div className="mt-8 border-t border-hair pt-6">
            <div className="flex items-center gap-2 text-sm font-medium text-ink"><ShieldAlert className="h-4 w-4 text-honey" />安全边界</div>
            <p className="mt-2 text-xs leading-6 text-mute">草稿创建、确认、取消、执行和失败都会进入审计时间线。删除未执行草稿仍需要明确确认。</p>
          </div>
        </section>

        <section className="page-column">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Review queue / 02</div>
              <h2 className="page-section-title">待处理草稿</h2>
            </div>
            <span className="font-mono text-xs text-mute">{pendingCount} pending · {drafts.length} total</span>
          </div>

          <div className="mt-6">
            {drafts.map((draft) => {
              const meta = statusMeta[draft.status] || { label: draft.status, className: "border-hair bg-surface-2 text-body" };
              return (
                <article key={draft.id} className="page-panel">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-xl font-semibold text-ink">{draft.title || draft.draft_type}</h3>
                        <span className={`border px-2.5 py-1 font-mono text-[10px] ${meta.className}`}>{meta.label}</span>
                        <span className={`border px-2.5 py-1 font-mono text-[10px] ${draft.risk_level === "high" ? "border-blush/35 bg-blush/10 text-blush" : "border-hair text-mute"}`}>
                          {draft.risk_level === "high" ? "高风险" : "中低风险"}
                        </span>
                      </div>
                      <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
                        {draft.draft_type} · {draft.target_type} · {new Date(draft.created_at).toLocaleString("zh-CN")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {draft.status === "pending_confirmation" && (
                        <>
                          <button type="button" className="inline-flex items-center gap-1 bg-ink px-3 py-2 text-xs font-medium text-surface transition hover:bg-prism disabled:opacity-50" disabled={loading} onClick={() => changeDraft(draft.id, "confirm")}>
                            <Check className="h-3.5 w-3.5" />确认执行
                          </button>
                          <button type="button" className="inline-flex items-center gap-1 border border-hair px-3 py-2 text-xs text-body transition hover:border-ink/30 disabled:opacity-50" disabled={loading} onClick={() => changeDraft(draft.id, "cancel")}>
                            <X className="h-3.5 w-3.5" />取消
                          </button>
                        </>
                      )}
                      {draft.status !== "executed" && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 border border-blush/35 px-3 py-2 text-xs text-blush transition hover:bg-blush/10 disabled:opacity-50"
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
                          <Trash2 className="h-3.5 w-3.5" />删除
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="markdown-body mt-5 border-l-2 border-prism bg-panel p-5 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft.content || "（无内容）"}</ReactMarkdown>
                  </div>
                  {draft.status === "executed" && <div className="mt-4 flex items-center gap-2 text-xs text-mint"><CheckCircle2 className="h-4 w-4" />人工确认完成，执行结果和操作者已经写入审计记录。</div>}
                  {draft.error_message && <div className="mt-4 border border-blush/25 bg-blush/10 p-3 text-xs text-blush">{draft.error_message}</div>}
                </article>
              );
            })}
            {drafts.length === 0 && <div className="page-empty"><div>暂无安全草稿。创建后会在这里排队等待人工确认。</div></div>}
          </div>

          <div className="mt-7">
            <div className="page-kicker">Audit trail / 03</div>
            <h2 className="page-section-title">审计时间线</h2>
            <div className="mt-5 border-t border-hair">
              {audits.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-start gap-3 border-b border-hair py-4">
                  <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.status === "success" ? "bg-mint" : "bg-blush"}`} />
                  <div>
                    <div className="text-sm text-ink">{auditLabel(item.action)}</div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-mute">{item.status} · {new Date(item.created_at).toLocaleString("zh-CN")}</div>
                  </div>
                </div>
              ))}
              {audits.length === 0 && <div className="py-8 text-center text-sm text-mute">暂无审计记录。</div>}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Summary({ icon: Icon, label, value, tone = "teal" }: { icon: typeof FileText; label: string; value: number; tone?: "teal" | "amber" | "green" }) {
  const color = tone === "amber" ? "text-honey" : tone === "green" ? "text-mint" : "text-prism";
  return (
    <div className="flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <div>
        <div className="mono-eyebrow">{label}</div>
        <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-ink">{value}</div>
      </div>
    </div>
  );
}

function auditLabel(action: string) {
  if (action.startsWith("action_draft.confirm")) return "人工确认并执行草稿";
  if (action === "action_draft.create") return "创建待确认草稿";
  if (action === "action_draft.cancel") return "取消草稿";
  return action;
}

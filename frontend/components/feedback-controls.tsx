"use client";

import { Check, LoaderCircle, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { useEffect, useState } from "react";

import { apiPost } from "@/lib/api";

export type ChatFeedbackRecord = {
  id: string;
  repo_id: string;
  conversation_id: string;
  assistant_message_id: string;
  run_id?: string | null;
  rating: "helpful" | "unhelpful";
  reason?: FeedbackReason | null;
  comment?: string | null;
  review_status: "open" | "in_review" | "resolved" | "dismissed";
  notification_status: string;
  notification_error?: string | null;
};

type FeedbackReason =
  | "inaccurate"
  | "not_relevant"
  | "missing_context"
  | "unreliable_citation"
  | "tool_error"
  | "other";

type FeedbackControlsProps = {
  repoId: string;
  conversationId: string;
  messageId: string;
  initialFeedback?: ChatFeedbackRecord;
  onSaved: (feedback: ChatFeedbackRecord) => void;
};

const REASONS: Array<{ value: FeedbackReason; label: string }> = [
  { value: "inaccurate", label: "内容不准确" },
  { value: "not_relevant", label: "没有解决问题" },
  { value: "missing_context", label: "缺少关键上下文" },
  { value: "unreliable_citation", label: "引用不可靠" },
  { value: "tool_error", label: "工具执行异常" },
  { value: "other", label: "其他" }
];

export function FeedbackControls({
  repoId,
  conversationId,
  messageId,
  initialFeedback,
  onSaved
}: FeedbackControlsProps) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [panelOpen, setPanelOpen] = useState(false);
  const [reason, setReason] = useState<FeedbackReason | undefined>(initialFeedback?.reason ?? undefined);
  const [comment, setComment] = useState(initialFeedback?.comment ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setFeedback(initialFeedback);
    setReason(initialFeedback?.reason ?? undefined);
    setComment(initialFeedback?.comment ?? "");
  }, [initialFeedback]);

  async function submit(rating: "helpful" | "unhelpful") {
    setPending(true);
    setError("");
    try {
      const result = await apiPost<ChatFeedbackRecord>("/api/chat/feedback", {
        repo_id: repoId,
        conversation_id: conversationId,
        assistant_message_id: messageId,
        rating,
        reason: rating === "unhelpful" ? reason : null,
        comment: rating === "unhelpful" ? comment.trim() || null : null
      });
      setFeedback(result);
      setPanelOpen(false);
      onSaved(result);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "反馈提交失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-hair pt-3">
      <div className="flex min-h-8 items-center gap-1.5">
        <button
          type="button"
          title="回答有帮助"
          aria-label="回答有帮助"
          aria-pressed={feedback?.rating === "helpful"}
          disabled={pending}
          onClick={() => void submit("helpful")}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-500 ease-silk disabled:cursor-not-allowed disabled:opacity-50 ${
            feedback?.rating === "helpful" ? "bg-mint/10 text-mint shadow-glow" : "text-mute hover:bg-surface-2 hover:text-body"
          }`}
        >
          {pending && !panelOpen ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
        </button>
        <button
          type="button"
          title="回答没帮助"
          aria-label="回答没帮助"
          aria-pressed={feedback?.rating === "unhelpful"}
          disabled={pending}
          onClick={() => {
            setPanelOpen(true);
            setError("");
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-500 ease-silk disabled:cursor-not-allowed disabled:opacity-50 ${
            feedback?.rating === "unhelpful" ? "bg-blush/10 text-blush shadow-glow" : "text-mute hover:bg-surface-2 hover:text-body"
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
        {feedback && !panelOpen && (
          <span className="ml-1 flex min-w-0 items-center gap-1.5 text-xs text-mute">
            <Check className="h-3.5 w-3.5 shrink-0 text-mint" />
            已记录
            {feedback.run_id && <span className="truncate font-mono text-[11px] text-dim">trace {feedback.run_id.slice(0, 8)}</span>}
          </span>
        )}
      </div>

      {panelOpen && (
        <div className="animate-fade-up mt-3 max-w-xl rounded-xl border border-blush/20 bg-blush/5 p-4 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-body">这条回答哪里需要改进？</span>
            <button
              type="button"
              title="关闭"
              aria-label="关闭反馈"
              onClick={() => setPanelOpen(false)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-mute transition-colors hover:bg-surface hover:text-body"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {REASONS.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={reason === item.value}
                onClick={() => setReason(item.value)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition-all duration-500 ease-silk ${
                  reason === item.value
                    ? "border-blush/40 bg-surface text-blush shadow-glow"
                    : "border-hair bg-surface text-body hover:border-prism/30 hover:text-prism"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            maxLength={1000}
            rows={2}
            onChange={(event) => setComment(event.target.value)}
            placeholder="补充说明（可选）"
            className="mt-3 w-full resize-y rounded-lg border border-hair bg-surface-2/60 px-3 py-2 text-xs leading-6 text-ink outline-none transition focus:border-prism/40"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-blush">{error}</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => void submit("unhelpful")}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-prism px-3.5 text-xs font-medium text-white shadow-lift transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
              提交反馈
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

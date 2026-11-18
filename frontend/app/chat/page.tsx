"use client";

import { useEffect, useState } from "react";

import { PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiGet, apiPostStream } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { AppSelect } from "@/components/ui/select";

const samples = [
  "最近一次 CI 为什么失败？",
  "总结最近一个 PR 的风险点",
  "最近的 Issue 应该由谁负责？",
  "生成本周工程周报",
  "阅读 backend/app/services/agents/chat_agent.py 并讲解 tool calling 的实现",
];

export default function ChatPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoId, setRepoId] = useState("");
  const [message, setMessage] = useState("最近一次 CI 为什么失败？");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<Repository[]>("/api/repos").then((items) => {
      setRepos(items);
      setRepoId((current) => current || items[0]?.id || "");
    });
  }, []);

  async function send() {
    setLoading(true);
    setResult("");
    try {
      await apiPostStream("/api/chat/stream", { repo_id: repoId, message, context: { time_range: "7d", messages: [] } }, (event, rawData) => {
        if (event === "delta") {
          const data = rawData as { content?: string };
          if (data.content) setResult((current) => current + data.content);
        }
        if (event === "final") {
          setResult(JSON.stringify(rawData, null, 2));
        }
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageTitle
        eyebrow="03 / Agent chat"
        title="Agent 对话"
        description="使用原生 tool calling 检查代码、检索项目记忆、运行专项分析，并起草安全操作。"
      />
      <div className="page-grid grid-cols-[380px_minmax(0,1fr)]">
        <section className="page-column">
          <div className="page-kicker">Compose / 01</div>
          <h2 className="page-section-title">发起提问</h2>
          <p className="page-section-note">选择仓库上下文，输入要交给 Agent 的问题。</p>

          <div className="mt-7">
            <AppSelect
              value={repoId}
              onChange={setRepoId}
              ariaLabel="选择仓库"
              options={repos.length ? repos.map((repo) => ({ value: repo.id, label: repo.full_name })) : [{ value: "", label: "暂无仓库，请先连接" }]}
            />
          </div>

          <label className="page-form-field mt-5">
            <span>问题</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="输入要询问 Agent 的问题…"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            {samples.map((sample) => (
              <button
                key={sample}
                onClick={() => setMessage(sample)}
                className="rounded-full border border-hair bg-panel px-3.5 py-1.5 text-xs text-mute transition-all duration-500 ease-silk hover:border-prism/30 hover:bg-teal-50 hover:text-prism"
              >
                {sample}
              </button>
            ))}
          </div>

          <PrimaryButton onClick={send} disabled={loading || !repoId || !message.trim()} className="mt-5">
            {loading ? "Agent 分析中…" : "询问 Agent"}
          </PrimaryButton>
        </section>

        <section className="page-column">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Stream / 02</div>
              <h2 className="page-section-title">Agent 回答</h2>
            </div>
            <span className="font-mono text-xs text-mute">{loading ? "流式输出中…" : result ? "已返回" : "等待提问"}</span>
          </div>

          {result ? (
            <pre className="mt-5 overflow-x-auto whitespace-pre-wrap border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{result}</pre>
          ) : (
            !loading && (
              <div className="page-empty mt-5">
                <div>
                  <div className="text-sm font-medium text-body">回答会流式显示在这里</div>
                  <div className="mx-auto mt-1 max-w-[280px] text-xs leading-5 text-mute">Agent 会按需调用代码检查、记忆检索与专项分析工具，再给出结论。</div>
                </div>
              </div>
            )
          )}
        </section>
      </div>
    </>
  );
}

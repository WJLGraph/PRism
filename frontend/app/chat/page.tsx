"use client";

import { useEffect, useState } from "react";

import { Card, PageTitle, PrimaryButton } from "@/components/ui/card";
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
        title="Agent 对话"
        description="使用原生 tool calling 检查代码、检索项目记忆、运行专项分析，并起草安全操作。"
      />
      <div className="lg:h-[calc(100vh-13.5rem)]">
        <Card className="animate-fade-up flex min-h-0 flex-col">
          <AppSelect
            className="mb-4 w-full"
            value={repoId}
            onChange={setRepoId}
            options={repos.length ? repos.map((repo) => ({ value: repo.id, label: repo.full_name })) : [{ value: "", label: "暂无仓库，请先连接" }]}
          />
          <textarea
            className="min-h-32 w-full resize-none rounded-xl border border-hair bg-surface-2/60 px-4 py-3.5 text-sm leading-7 text-ink outline-none transition duration-500 ease-silk placeholder:text-dim focus:border-prism/40 focus:shadow-glow"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="输入要询问 Agent 的问题…"
          />

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

          {result ? (
            <pre className="mt-4 min-h-0 flex-1 overflow-auto rounded-xl border border-hair bg-canvas p-4 font-mono text-xs leading-6 text-ink">{result}</pre>
          ) : (
            !loading && (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-hair bg-surface-2/50 px-4 py-8 text-center">
                <div className="text-sm font-medium text-body">回答会流式显示在这里</div>
                <div className="max-w-[280px] text-xs leading-5 text-mute">Agent 会按需调用代码检查、记忆检索与专项分析工具，再给出结论。</div>
              </div>
            )
          )}
        </Card>
      </div>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Folder, Trash2 } from "lucide-react";

import { Card, PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiDelete, apiGet, apiPost } from "@/lib/api";
import { API_BASE_URL } from "@/lib/api";
import type { Repository } from "@/lib/types";
import { AppSelect } from "@/components/ui/select";

type RepoConnectResult = {
  repo_id: string;
  full_name: string;
  provider: string;
  api_base_url?: string | null;
  local_path?: string | null;
  checkout_mode?: string;
  default_branch?: string | null;
  connected: boolean;
  demo_mode: boolean;
  message: string;
};

type RepoSource = "remote" | "local";

type RepoSyncResult = {
  repo_id: string;
  status: string;
  synced: {
    issues: number;
    pull_requests: number;
    workflow_runs: number;
  };
};

const providers = [
  { value: "github", label: "GitHub", hint: "默认平台，支持 public repo 和 Personal Access Token。" },
  { value: "github_compatible", label: "自定义 GitHub-compatible API", hint: "适合 GitHub Enterprise、Gitea 或兼容 GitHub REST 的网关。" },
  { value: "gitlab", label: "GitLab", hint: "界面已预留，真实同步需要单独适配 GitLab API。" },
  { value: "gitee", label: "Gitee", hint: "界面已预留，真实同步需要单独适配 Gitee API。" }
];

export default function ReposPage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [source, setSource] = useState<RepoSource>("remote");
  const [provider, setProvider] = useState("github");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [cloneParentDir, setCloneParentDir] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://api.github.com");
  const [token, setToken] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const selectedProvider = providers.find((item) => item.value === provider) ?? providers[0];
  const supportsRealConnect = provider === "github" || provider === "github_compatible";

  async function refreshRepos(nextSelectedId?: string) {
    const items = await apiGet<Repository[]>("/api/repos");
    setRepos(items);
    setSelectedRepoId(nextSelectedId || selectedRepoId || items[0]?.id || "");
  }

  useEffect(() => {
    refreshRepos().catch(() => setRepos([]));
  }, []);

  async function syncRepo(repoId: string) {
    const data = await apiPost<RepoSyncResult>(`/api/repos/${repoId}/sync`, {
      sync_issues: true,
      sync_pull_requests: true,
      sync_workflow_runs: true,
      limit: 50
    });
    setSelectedRepoId(repoId);
    await refreshRepos(repoId);
    return data;
  }

  async function connect() {
    if (source === "remote" && (!owner.trim() || !repo.trim())) {
      setResult(JSON.stringify({ error: "请填写 Owner / Namespace 和 Repository。" }, null, 2));
      return;
    }
    if (source === "local" && !localPath.trim()) {
      setResult(JSON.stringify({ error: "请填写本地 Git 仓库路径。" }, null, 2));
      return;
    }
    setLoading(true);
    try {
      const connected = await apiPost<RepoConnectResult>("/api/repos/connect", {
        owner: source === "remote" ? owner.trim() : undefined,
        repo: source === "remote" ? repo.trim() : undefined,
        local_path: source === "local" ? localPath.trim() : undefined,
        clone_parent_dir: source === "remote" && cloneParentDir.trim() ? cloneParentDir.trim() : undefined,
        provider,
        api_base_url: provider === "github" ? undefined : apiBaseUrl,
        token: token || undefined,
        demo_mode: false
      });
      setResult(JSON.stringify({ connected, background_sync: "scheduled" }, null, 2));
      await refreshRepos(connected.repo_id);
    } catch (error) {
      setResult(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function refreshRepo(repoId: string) {
    setLoading(true);
    try {
      const synced = await syncRepo(repoId);
      setResult(JSON.stringify({ refreshed: synced }, null, 2));
    } catch (error) {
      setResult(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function selectRepo(repoId: string) {
    setSelectedRepoId(repoId);
    const data = await apiPost(`/api/repos/${repoId}/select`, {});
    setResult(JSON.stringify(data, null, 2));
    await refreshRepos(repoId);
  }

  async function deleteRepo(item: Repository) {
    const confirmed = window.confirm(`确认删除仓库 ${item.full_name} 及其本地同步的 Issues、PR、CI、分析结果吗？此操作只删除本系统本地数据，不会删除远程 Git 仓库。`);
    if (!confirmed) return;
    setLoading(true);
    try {
      const data = await apiDelete(`/api/repos/${item.id}`);
      setResult(JSON.stringify(data, null, 2));
      await refreshRepos();
    } catch (error) {
      setResult(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageTitle title="仓库接入" description="连接真实 Git 仓库后会立即触发后台同步；生产环境可配置 Webhook 实时触发，并通过定时同步兜底。" />

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="animate-fade-in stagger-1">
          <div className="mono-eyebrow mb-4">Connection / 连接配置</div>
          <div className="grid gap-5">
            <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-hair bg-surface-2 p-1">
              <button
                type="button"
                onClick={() => setSource("remote")}
                className={`h-9 rounded-lg px-3 text-sm font-medium transition-all duration-500 ease-silk ${source === "remote" ? "bg-surface text-ink shadow-card" : "text-body hover:text-ink"}`}
              >
                GitHub 地址
              </button>
              <button
                type="button"
                onClick={() => setSource("local")}
                className={`h-9 rounded-lg px-3 text-sm font-medium transition-all duration-500 ease-silk ${source === "local" ? "bg-surface text-ink shadow-card" : "text-body hover:text-ink"}`}
              >
                本地仓库
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[260px_1fr_1fr]">
              <label className="text-sm font-medium text-body">
                托管平台
                <AppSelect
                  className="mt-2 w-full"
                  value={provider}
                  onChange={(next) => {
                    setProvider(next);
                    if (next === "github") setApiBaseUrl("https://api.github.com");
                    if (next === "github_compatible") setApiBaseUrl("https://api.example.com");
                    if (next === "gitlab") setApiBaseUrl("https://gitlab.com/api/v4");
                    if (next === "gitee") setApiBaseUrl("https://gitee.com/api/v5");
                  }}
                  options={providers.map((item) => ({ value: item.value, label: item.label }))}
                />
              </label>

              {source === "remote" ? (
                <>
                  <label className="text-sm font-medium text-body">
                    Owner / Namespace
                    <input
                      className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow"
                      value={owner}
                      onChange={(event) => setOwner(event.target.value)}
                      placeholder="296569015"
                    />
                  </label>

                  <label className="text-sm font-medium text-body">
                    Repository
                    <input
                      className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow"
                      value={repo}
                      onChange={(event) => setRepo(event.target.value)}
                      placeholder="clowder-ai"
                    />
                  </label>
                </>
              ) : (
                <label className="text-sm font-medium text-body lg:col-span-2">
                  本地仓库路径
                  <div className="mt-2 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow"
                      value={localPath}
                      onChange={(event) => setLocalPath(event.target.value)}
                      placeholder="例如 D:\\code\\my-repo"
                    />
                    <span className="inline-flex w-10 shrink-0 items-center justify-center rounded-lg border border-hair bg-surface text-mute">
                      <Folder className="h-4 w-4" />
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-sm leading-6 text-body">
            <div className="font-medium text-prism">{selectedProvider.label}</div>
            <div>{selectedProvider.hint}</div>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <label className="text-sm font-medium text-body">
              API Base URL
              <input
                className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow disabled:bg-surface-2"
                value={apiBaseUrl}
                disabled={provider === "github"}
                onChange={(event) => setApiBaseUrl(event.target.value)}
              />
            </label>

            <label className="text-sm font-medium text-body">
              Access Token
              <input
                type="password"
                className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="public repo 可留空，私有仓库需要 token"
              />
            </label>

            {source === "remote" && (
              <label className="text-sm font-medium text-body lg:col-span-2">
                下载父目录
                <input
                  className="mt-2 w-full rounded-lg border border-hair bg-surface px-3 py-2 outline-none transition focus:border-prism/50 focus:shadow-glow"
                  value={cloneParentDir}
                  onChange={(event) => setCloneParentDir(event.target.value)}
                  placeholder="例如 D:\\code\\repos，留空则使用默认缓存目录"
                />
              </label>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton
              onClick={connect}
              disabled={loading || !supportsRealConnect || (source === "remote" ? !owner.trim() || !repo.trim() : !localPath.trim())}
            >
              {loading ? "连接并同步中..." : "连接并自动同步"}
            </PrimaryButton>
          </div>

          {!supportsRealConnect && (
            <p className="mt-4 text-sm text-honey">当前平台已在界面预留，但真实 API 同步尚未实现。请选择 GitHub 或 GitHub-compatible API。</p>
          )}

          {result && <pre className="mt-5 overflow-auto rounded-xl border border-hair bg-surface-2 p-4 font-mono text-xs leading-6 text-body">{result}</pre>}
        </Card>

        <Card className="animate-fade-in stagger-2">
          <div className="mono-eyebrow mb-4">Repositories</div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">已连接仓库</h2>
            <span className="rounded-full border border-hair bg-panel px-2.5 py-1 font-mono text-xs tabular-nums text-mute">{repos.length} 个</span>
          </div>
          <div className="mt-5 space-y-4">
            {repos.length === 0 && <p className="text-sm text-body">还没有仓库。请连接一个真实 Git 仓库。</p>}
            {repos.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl border p-4 transition-all duration-500 ease-silk ${selectedRepoId === item.id ? "border-prism/40 bg-teal-50/50 shadow-card" : "border-hair bg-surface card-lift hover:border-prism/30"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-ink">{item.full_name}</div>
                    <div className="mt-1 text-xs text-mute">
                      {item.provider || "github"} · {item.default_branch || "main"}
                    </div>
                    {item.local_path && <div className="mt-1 break-all text-xs text-mute">{item.checkout_mode === "local" ? "本地仓库" : "代码路径"}：{item.local_path}</div>}
                  </div>
                  <span className="rounded-full border border-hair bg-panel px-2.5 py-1 text-xs text-mute">{selectedRepoId === item.id ? "当前查看" : "已连接"}</span>
                </div>
                <p className="mt-3 break-words text-sm leading-6 text-body">{item.description || "暂无仓库描述"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => selectRepo(item.id)}
                    className="rounded-lg border border-hair bg-surface px-3 py-1.5 text-xs font-medium text-body transition-all duration-500 ease-silk hover:border-prism/40 hover:bg-panel hover:text-prism"
                  >
                    设为当前查看
                  </button>
                  <button
                    onClick={() => refreshRepo(item.id)}
                    disabled={loading}
                    className="rounded-lg bg-prism px-3 py-1.5 text-xs font-medium text-white shadow-lift transition-all duration-500 ease-silk hover:bg-accent disabled:opacity-60"
                  >
                    立即刷新
                  </button>
                  <button
                    onClick={() => deleteRepo(item)}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-lg border border-blush/30 bg-surface px-3 py-1.5 text-xs font-medium text-blush transition-all duration-500 ease-silk hover:bg-blush/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5 animate-fade-in stagger-3">
        <div className="mono-eyebrow mb-3">Production</div>
        <h2 className="font-display text-lg font-semibold tracking-tight2 text-ink">生产同步策略</h2>
        <div className="mt-5 grid gap-4 text-sm leading-6 text-body md:grid-cols-3">
          <div className="rounded-xl border border-hair bg-panel p-4">
            <div className="font-medium text-ink">连接后自动同步</div>
            <p className="mt-1">仓库校验成功后，后端会立即调度一次后台同步。</p>
          </div>
          <div className="rounded-xl border border-hair bg-panel p-4">
            <div className="font-medium text-ink">Webhook 实时触发</div>
            <p className="mt-1 break-all">GitHub Webhook URL：{API_BASE_URL}/api/webhooks/github</p>
          </div>
          <div className="rounded-xl border border-hair bg-panel p-4">
            <div className="font-medium text-ink">定时同步兜底</div>
            <p className="mt-1">后端启动后会定时刷新已连接仓库，默认 5 分钟一次。</p>
          </div>
        </div>
      </Card>
    </>
  );
}

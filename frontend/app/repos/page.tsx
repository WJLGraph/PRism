"use client";

import { useEffect, useState } from "react";
import { Folder, ShieldCheck, Trash2, Webhook, TimerReset, PlugZap } from "lucide-react";

import { PageTitle, PrimaryButton } from "@/components/ui/card";
import { apiDelete, apiGet, apiPost, API_BASE_URL } from "@/lib/api";
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
      <PageTitle
        eyebrow="01 / Repository intake"
        title="仓库接入"
        description="连接真实 Git 仓库后立即触发后台同步。界面与字段保持稳定，生产环境可继续接入 Webhook 与定时同步。"
      />

      <div className="page-grid">
        <section className="page-column">
          <div className="grid gap-x-14 gap-y-12 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)]">
            <div>
              <div className="page-kicker">Connection / 连接配置</div>
              <h2 className="page-section-title">建立工程上下文</h2>
              <p className="page-section-note">支持远程 GitHub 兼容仓库与本地 Git 路径。连接只写入本系统，不会修改远程仓库。</p>

          <div className="mt-7 grid grid-cols-2 border border-hair">
            {(["remote", "local"] as RepoSource[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSource(value)}
                className={`h-11 text-xs font-medium transition ${
                  source === value ? "bg-ink text-surface" : "bg-surface text-mute hover:text-ink"
                }`}
              >
                {value === "remote" ? "GitHub 地址" : "本地仓库"}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            <label className="page-form-field">
              <span>托管平台</span>
              <AppSelect
                className="w-full"
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
                <label className="page-form-field">
                  <span>Owner / Namespace</span>
                  <input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="296569015" />
                </label>
                <label className="page-form-field">
                  <span>Repository</span>
                  <input value={repo} onChange={(event) => setRepo(event.target.value)} placeholder="clowder-ai" />
                </label>
              </>
            ) : (
              <label className="page-form-field lg:col-span-2">
                <span>本地仓库路径</span>
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1"
                    value={localPath}
                    onChange={(event) => setLocalPath(event.target.value)}
                    placeholder="例如 D:\\code\\my-repo"
                  />
                  <span className="grid w-11 shrink-0 place-items-center border border-hair text-mute"><Folder className="h-4 w-4" /></span>
                </div>
              </label>
            )}
          </div>

          <div className="mt-5 border-l-2 border-prism bg-teal-50 px-4 py-3">
            <div className="text-xs font-medium text-prism">{selectedProvider.label}</div>
            <p className="mt-1 text-xs leading-6 text-body">{selectedProvider.hint}</p>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="page-form-field">
              <span>API Base URL</span>
              <input value={apiBaseUrl} disabled={provider === "github"} onChange={(event) => setApiBaseUrl(event.target.value)} />
            </label>
            <label className="page-form-field">
              <span>Access Token</span>
              <input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="public repo 可留空，私有仓库需要 token" />
            </label>
            {source === "remote" && (
              <label className="page-form-field lg:col-span-2">
                <span>下载父目录</span>
                <input value={cloneParentDir} onChange={(event) => setCloneParentDir(event.target.value)} placeholder="例如 D:\\code\\repos，留空则使用默认缓存目录" />
              </label>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-hair pt-6">
            <PrimaryButton
              onClick={connect}
              disabled={loading || !supportsRealConnect || (source === "remote" ? !owner.trim() || !repo.trim() : !localPath.trim())}
            >
              <PlugZap className="h-4 w-4" />
              {loading ? "连接并同步中..." : "连接并自动同步"}
            </PrimaryButton>
            {!supportsRealConnect && <p className="text-xs text-honey">当前平台仅预留界面，请选择 GitHub 或 GitHub-compatible API。</p>}
          </div>

          {result && (
            <pre className="mt-5 max-h-80 overflow-auto border border-hair bg-canvas p-4 font-mono text-[11px] leading-6 text-body">{result}</pre>
          )}
            </div>

            <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="page-kicker">Repositories / 02</div>
              <h2 className="page-section-title">已连接仓库</h2>
            </div>
            <span className="font-mono text-xs text-mute">{repos.length} 个连接</span>
          </div>

          <div className="mt-6">
            {repos.length === 0 && <div className="page-empty"><div>还没有仓库。请连接一个真实 Git 仓库。</div></div>}
            {repos.map((item) => (
              <article key={item.id} className={`page-panel ${selectedRepoId === item.id ? "border-l-2 border-l-prism" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-[15px] font-medium text-ink">{item.full_name}</h3>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-mute">
                      {item.provider || "github"} · {item.default_branch || "main"}
                    </div>
                    {item.local_path && <div className="mt-1 break-all text-[11px] text-mute">{item.checkout_mode === "local" ? "本地仓库" : "代码路径"}：{item.local_path}</div>}
                  </div>
                  <span className={`border px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] ${selectedRepoId === item.id ? "border-prism/35 bg-teal-50 text-prism" : "border-hair text-mute"}`}>
                    {selectedRepoId === item.id ? "Current" : "Connected"}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-6 text-body">{item.description || "暂无仓库描述"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => selectRepo(item.id)} className="border border-hair px-3 py-1.5 text-xs text-body transition hover:border-ink/30 hover:text-ink">
                    设为当前查看
                  </button>
                  <button type="button" onClick={() => refreshRepo(item.id)} disabled={loading} className="border border-ink bg-ink px-3 py-1.5 text-xs font-medium text-surface transition hover:border-prism hover:bg-prism disabled:opacity-50">
                    立即刷新
                  </button>
                  <button type="button" onClick={() => deleteRepo(item)} disabled={loading} className="inline-flex items-center gap-1 border border-blush/35 px-3 py-1.5 text-xs text-blush transition hover:bg-blush/10 disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />删除
                  </button>
                </div>
              </article>
            ))}
          </div>
            </div>
          </div>
        </section>
      </div>

      <section className="page-band">
        <div className="page-kicker">Production / 03</div>
        <h2 className="page-section-title">生产同步策略</h2>
        <div className="mt-7 grid gap-0 border border-hair md:grid-cols-3">
          {[
            { icon: PlugZap, title: "连接后自动同步", text: "仓库校验成功后，后端会立即调度一次后台同步。" },
            { icon: Webhook, title: "Webhook 实时触发", text: `${API_BASE_URL}/api/webhooks/github` },
            { icon: TimerReset, title: "定时同步兜底", text: "后端启动后会定时刷新已连接仓库，默认 5 分钟一次。" }
          ].map((item) => (
            <div key={item.title} className="p-5 [&+&]:border-t [&+&]:border-hair md:[&+&]:border-l md:[&+&]:border-t-0">
              <item.icon className="h-4 w-4 text-prism" />
              <h3 className="mt-3 text-sm font-medium text-ink">{item.title}</h3>
              <p className="mt-2 break-all text-xs leading-6 text-mute">{item.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-2 text-xs text-mute"><ShieldCheck className="h-4 w-4 text-mint" />所有外部写操作均保留确认与审计路径。</div>
      </section>
    </>
  );
}

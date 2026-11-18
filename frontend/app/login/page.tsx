"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { apiPost } from "@/lib/api";
import { setSession } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { BrandMark, Wordmark } from "@/components/layout/app-shell";

interface LoginResponse {
  token: string;
  username: string;
}

const capabilities = [
  ["01", "Pull Request", "PR / Issue 审查与协作是系统主战场"],
  ["02", "Multi-Agent", "Planner、审查、排障、综合各自折射一个视角"],
  ["03", "A2A Protocol", "Agent2Agent 协议让多 Agent 以标准帧对话"]
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const data = await apiPost<LoginResponse>("/api/auth/login", { username, password });
      setSession(data.token, data.username);
      await router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请稍后重试");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-labelledby="login-brand-title">
        <div className="login-story-top">
          <div className="flex items-center gap-3 text-prism">
            <BrandMark size={34} />
            <Wordmark />
          </div>
          <span className="mono-eyebrow">AI engineering / 2026</span>
        </div>

        <div className="login-hero-copy">
          <div className="mono-eyebrow mb-7 text-prism">PR / Pull Request + Prism / 光谱折射</div>
          <h1 id="login-brand-title">
            一束需求光，<br />
            <em>折射工程全谱。</em>
          </h1>
          <p>
            <strong className="font-medium text-ink">PRism AI</strong>：面向 GitHub 研发协作的多智能体平台，基于 A2A 协议实现跨 Agent 对话与任务委派。
            Issue 分析、PR 审查、CI 排障与知识问答，从同一束工作输入折射而出。
          </p>
        </div>

        <div className="login-prism-study" aria-hidden>
          <svg viewBox="0 0 560 230" fill="none">
            <path d="M46 170h148" stroke="currentColor" strokeWidth="1" />
            <path d="m279 25 118 180H161L279 25Z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M46 170 232 132" stroke="currentColor" strokeWidth="1.2" />
            <path d="m232 132 91 13 171-70M323 145l171 0M323 145l171 70" stroke="currentColor" strokeWidth="1" />
            <path d="m323 145 171-34" stroke="currentColor" strokeWidth=".8" strokeDasharray="3 5" />
            <circle cx="232" cy="132" r="3" fill="currentColor" />
            <circle cx="323" cy="145" r="3" fill="currentColor" />
          </svg>
          <span>ONE BEAM IN</span>
          <span>FULL SPECTRUM OUT</span>
          <div className="login-spectrum-legend">
            <span>ISSUE</span><span>PR REVIEW</span><span>CI DEBUG</span><span>RAG / MEMORY</span>
          </div>
        </div>

        <div className="login-capabilities">
          {capabilities.map(([index, title, description]) => (
            <div key={index}>
              <span>{index}</span>
              <strong>{title}</strong>
              <p>{description}</p>
            </div>
          ))}
        </div>

        <p className="login-tagline">One beam of work in, a full spectrum of engineering insight out.</p>
      </section>

      <section className="login-form-panel" aria-labelledby="login-form-title">
        <div className="login-form-top">
          <span className="mono-eyebrow">Private workspace</span>
          <ThemeToggle />
        </div>

        <div className="login-form-wrap">
          <div className="mb-10 md:hidden">
            <div className="flex items-center gap-2.5 text-prism"><BrandMark size={29} /><Wordmark /></div>
            <p className="mt-5 max-w-xs font-display text-2xl leading-snug text-ink">一束需求光，<em className="text-prism">折射工程全谱。</em></p>
          </div>

          <div className="mono-eyebrow text-prism">Sign in / 01</div>
          <h2 id="login-form-title">欢迎回来</h2>
          <p className="login-form-intro">进入你的研发智能工作台。会话仅保存在当前浏览器。</p>

          <form onSubmit={handleSubmit} className="mt-10 grid gap-7">
            <label className="login-field">
              <span>账号 / Username</span>
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="admin"
                required
                autoFocus
              />
            </label>
            <label className="login-field">
              <span>密码 / Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="输入密码"
                required
              />
            </label>

            {error && <div className="login-error" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className="login-submit magnetic">
              <span>{loading ? "正在进入工作台" : "进入工作台"}</span>
              {loading ? <Loader2 size={17} className="animate-spin" /> : <ArrowRight size={17} strokeWidth={1.6} />}
            </button>
          </form>

          <div className="login-demo-note">
            <span className="status-dot mt-1.5 shrink-0" />
            <p>演示账号 <code>admin / prism2026</code><br />可在服务端环境变量中修改。</p>
          </div>
        </div>

        <div className="login-form-footer">
          <span>PRism Console</span>
          <span>Secure · Local session</span>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Sparkles,
  Database,
  FilePenLine,
  Workflow,
  BookOpen,
  FlaskConical,
  Network,
  Gauge,
  FolderGit2,
  LogOut
} from "lucide-react";
import { clearSession, getToken, getUsername } from "@/lib/auth";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const navGroups = [
  {
    label: "协作中枢",
    en: "01 / Core",
    items: [
      { href: "/", label: "工作台", en: "Workspace", icon: Sparkles },
      { href: "/repos", label: "仓库管理", en: "Repos", icon: Database },
      { href: "/action-drafts", label: "操作草稿", en: "Drafts", icon: FilePenLine },
      { href: "/workflow-runs", label: "运行记录", en: "Runs", icon: Workflow }
    ]
  },
  {
    label: "知识智能",
    en: "02 / Intelligence",
    items: [
      { href: "/knowledge", label: "项目知识", en: "Knowledge", icon: BookOpen },
      { href: "/rag", label: "RAG 工作室", en: "RAG Studio", icon: FlaskConical },
      { href: "/code-graph", label: "代码图谱", en: "Code Graph", icon: Network }
    ]
  },
  {
    label: "质量评测",
    en: "03 / Quality",
    items: [
      { href: "/evals", label: "质量评测", en: "Evals", icon: Gauge },
      { href: "/workspaces", label: "报告中心", en: "Reports", icon: FolderGit2 }
    ]
  }
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden>
      <defs>
        <linearGradient id="prism-g" x1="3" y1="4" x2="23" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(var(--teal-400))" />
          <stop offset="0.55" stopColor="rgb(var(--teal-600))" />
          <stop offset="1" stopColor="rgb(var(--orb-b))" />
        </linearGradient>
      </defs>
      <path d="M13 2L24 21H2L13 2Z" stroke="url(#prism-g)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13 7L19.5 18.5H6.5L13 7Z" fill="url(#prism-g)" fillOpacity="0.20" />
      <path d="M2 21H24" stroke="url(#prism-g)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={clsx("font-display font-semibold tracking-tight2 text-ink", compact ? "text-[15px]" : "text-[17px]")}>
      PR<span className="spectrum-text italic">ism</span>
    </span>
  );
}

function UserCard() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <div className="rounded-xl border border-hair bg-surface/60 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="glow-dot shrink-0" />
          <div className="min-w-0 leading-tight">
            <div className="break-all text-xs font-medium text-ink">{username ?? "已登录"}</div>
            <div className="font-mono text-[10px] text-dim">owner · 在线</div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          title="退出登录"
          className="magnetic shrink-0 rounded-md p-1.5 text-dim transition-colors duration-300 hover:bg-panel hover:text-blush"
        >
          <LogOut size={14} strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-hair pt-3">
        <ThemeToggle className="h-8 w-8" />
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Appearance</span>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6">
      {navGroups.map((group, index) => (
        <div key={group.label} className={clsx("animate-fade-up", `stagger-${index + 1}`)}>
          <div className="mb-2.5 flex items-center justify-between px-3">
            <span className="mono-eyebrow">{group.label}</span>
            <span className="font-mono text-[9px] tracking-[0.1em] text-dim/70">{group.en}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={clsx(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-500 ease-silk",
                    active
                      ? "bg-surface text-ink shadow-card"
                      : "text-body hover:bg-surface/50 hover:text-ink"
                  )}
                >
                  {active && (
                    <span className="spectrum-rule absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full" />
                  )}
                  <Icon
                    size={16}
                    strokeWidth={1.8}
                    className={clsx("shrink-0 transition-colors duration-500", active ? "text-prism" : "text-dim group-hover:text-mute")}
                  />
                  <span className="flex min-w-0 flex-1 items-baseline justify-between gap-1.5">
                    <span>{item.label}</span>
                    <span className={clsx("shrink-0 font-mono text-[9px] uppercase tracking-[0.1em]", active ? "text-prism/70" : "text-dim/70")}>
                      {item.en}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function MobileHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-hair bg-surface/85 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark />
          <Wordmark compact />
        </Link>
        <ThemeToggle className="h-8 w-8" />
      </div>
      <div className="flex gap-1 overflow-x-auto scrollbar-none px-3 pb-2">
        {navGroups.flatMap((g) => g.items).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition-colors duration-300",
              isActive(pathname, item.href) ? "bg-surface font-medium text-ink shadow-card" : "text-body hover:bg-surface/60"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setChecked(true);
      return;
    }
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  // 登录页独立呈现，不带工作台外壳
  if (pathname === "/login") {
    return <>{children}</>;
  }

  if (!checked) {
    return <div className="min-h-screen" />;
  }

  return (
    <div className="min-h-screen">
      {/* 桌面端：固定玻璃侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-hair bg-surface/70 px-4 py-6 backdrop-blur-xl lg:flex">
        <div>
          <Link href="/" className="mb-5 flex items-center gap-2.5 px-2">
            <BrandMark size={28} />
            <div className="leading-none">
              <Wordmark />
              <div className="mono-eyebrow mt-1.5 !text-[9px]">AI Dev Collaboration</div>
            </div>
          </Link>
          <div className="spectrum-rule animate-line-grow mb-6 ml-2 w-16 opacity-70 origin-left" />
          <NavLinks />
        </div>
        <UserCard />
      </aside>

      <MobileHeader />

      {/* 内容区 */}
      <main className="min-h-screen overflow-x-hidden px-3 py-3 lg:ml-64 lg:px-5 lg:py-5 xl:px-7">{children}</main>
    </div>
  );
}

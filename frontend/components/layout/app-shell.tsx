"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  BookOpen,
  Database,
  FilePenLine,
  FlaskConical,
  FolderGit2,
  Gauge,
  LogOut,
  Menu,
  Network,
  Sparkles,
  Workflow,
  X
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

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden>
      <path d="M15 3.5 27 24.5H3L15 3.5Z" stroke="currentColor" strokeWidth="1.35" strokeLinejoin="round" />
      <path d="m15 10 6.5 11.3h-13L15 10Z" fill="currentColor" fillOpacity=".1" />
      <path d="M1 15h7m14 0h7" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={clsx("wordmark", compact && "wordmark-compact")}>
      PR<span>ism</span>
    </span>
  );
}

function UserCard({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => setUsername(getUsername()), []);

  function handleLogout() {
    clearSession();
    onNavigate?.();
    router.replace("/login");
  }

  return (
    <div className="sidebar-user">
      <div className="flex min-w-0 items-center gap-3">
        <span className="status-dot" aria-hidden />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-medium text-ink">{username ?? "已登录"}</div>
          <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-dim">Owner · Online</div>
        </div>
        <ThemeToggle className="ml-auto h-8 w-8" />
        <button type="button" onClick={handleLogout} title="退出登录" aria-label="退出登录" className="icon-button">
          <LogOut size={15} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="主导航" className="flex flex-col gap-7">
      {navGroups.map((group) => (
        <div key={group.label}>
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="mono-eyebrow !text-[9px]">{group.label}</span>
            <span className="font-mono text-[8px] uppercase tracking-[0.12em] text-dim/75">{group.en}</span>
          </div>
          <div className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={clsx("sidebar-nav-item", active && "is-active")}
                >
                  <Icon size={16} strokeWidth={1.55} className="shrink-0" />
                  <span className="min-w-0 flex-1 text-[13px]">{item.label}</span>
                  <span className="font-mono text-[8px] uppercase tracking-[0.08em] opacity-55">{item.en}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function MobileHeader({ onOpen }: { onOpen: () => void }) {
  const pathname = usePathname();
  const current = navGroups.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));
  return (
    <header className="mobile-app-header lg:hidden">
      <button type="button" onClick={onOpen} className="icon-button" aria-label="打开导航">
        <Menu size={19} strokeWidth={1.6} />
      </button>
      <Link href="/" className="flex items-center gap-2.5 text-prism">
        <BrandMark size={23} />
        <Wordmark compact />
      </Link>
      <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.12em] text-mute">{current?.en ?? "PRism"}</span>
      <ThemeToggle className="h-8 w-8" />
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
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

  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMobileNavOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileNavOpen]);

  if (pathname === "/login") return <>{children}</>;
  if (!checked) return <div className="min-h-screen bg-canvas" aria-label="正在验证会话" />;

  const isFullBleed = pathname === "/" || pathname === "/rag" || pathname.startsWith("/knowledge/");

  return (
    <div className="min-h-screen bg-canvas">
      <aside className="app-sidebar hidden lg:flex">
        <Link href="/" className="brand-lockup">
          <BrandMark size={31} />
          <span>
            <Wordmark />
            <span className="mt-1 block font-mono text-[8px] uppercase tracking-[0.18em] text-dim">Engineering intelligence</span>
          </span>
        </Link>
        <div className="my-6 h-px bg-hair" />
        <NavLinks />
        <div className="mt-auto">
          <div className="mb-5 px-3 font-mono text-[8px] uppercase leading-5 tracking-[0.14em] text-dim">
            Context over noise.<br />Evidence over guesswork.
          </div>
          <UserCard />
        </div>
      </aside>

      <MobileHeader onOpen={() => setMobileNavOpen(true)} />
      {mobileNavOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden" role="dialog" aria-modal="true" aria-label="导航菜单">
          <button className="absolute inset-0 bg-black/35" onClick={() => setMobileNavOpen(false)} aria-label="关闭导航" />
          <aside className="mobile-nav-drawer">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-prism"><BrandMark /><Wordmark /></div>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="icon-button" aria-label="关闭导航"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto"><NavLinks onNavigate={() => setMobileNavOpen(false)} /></div>
            <UserCard onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <main className="app-main">
        <div key={pathname} className={`route-enter ${isFullBleed ? "route-full" : "route-page"}`}>{children}</div>
      </main>
    </div>
  );
}

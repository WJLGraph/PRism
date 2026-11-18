import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { MotionProvider } from "@/components/theme/motion-provider";

export const metadata: Metadata = {
  title: "PRism — AI 研发协作智能体平台",
  description:
    "PRism：面向 GitHub 研发团队的多智能体协作平台。Issue 分类、PR 审查、CI 排障、RAG 知识问答与工程周报，一束需求光折射出完整的工程洞察。"
};

/** 首屏防闪烁：在绘制前读取本地/系统主题并落到 html 上 */
const themeInitScript = `
(function(){
  try {
    var saved = localStorage.getItem('prism-theme');
    var theme = saved === 'dark' || saved === 'light'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'light';
  }
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        style={{
          ["--font-sans" as string]: "'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif",
          ["--font-mono" as string]: "'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace",
          ["--font-display" as string]: "'Fraunces', Georgia, serif"
        }}
      >
        <div className="ambient-root" aria-hidden>
          <div className="ambient-grid" />
          <div className="ambient-orb ambient-orb-indigo" />
          <div className="ambient-orb ambient-orb-cyan" />
          <div className="ambient-beam" />
          <div className="ambient-grain" />
        </div>
        <ThemeProvider>
          <MotionProvider>
            <AppShell>{children}</AppShell>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

/** 主题切换：太阳/月亮交叉淡入旋转，简洁克制 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "切换到浅色主题" : "切换到深色主题"}
      aria-label={isDark ? "切换到浅色主题" : "切换到深色主题"}
      className={`group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-md border border-hair bg-transparent text-mute transition-colors duration-300 hover:border-ink/30 hover:text-ink ${className}`}
    >
      <Sun
        size={16}
        strokeWidth={1.8}
        className={`absolute transition-all duration-500 ease-silk ${isDark ? "rotate-90 scale-50 opacity-0" : "rotate-0 scale-100 opacity-100"}`}
      />
      <Moon
        size={16}
        strokeWidth={1.8}
        className={`absolute transition-all duration-500 ease-silk ${isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-50 opacity-0"}`}
      />
    </button>
  );
}

import type { Config } from "tailwindcss";

/**
 * PRism 设计系统 v2「Prism · 双主题编辑感」
 * ---------------------------------------------------------------
 * 所有语义 token 由 CSS 变量驱动（见 app/globals.css），
 * 因此同一份 className 在 light / dark 两套主题下自动换值。
 * 视觉语言：编辑感极简 × 纸感高端 × 发丝线 × 呼吸节奏。
 */
const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /* 语义 token —— 全部指向 globals.css 中的 CSS 变量 */
        ink: "rgb(var(--ink) / <alpha-value>)",
        body: "rgb(var(--body) / <alpha-value>)",
        mute: "rgb(var(--mute) / <alpha-value>)",
        dim: "rgb(var(--dim) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        hair: "rgb(var(--hair) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        prism: "rgb(var(--prism) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        mint: "rgb(var(--mint) / <alpha-value>)",
        blush: "rgb(var(--blush) / <alpha-value>)",
        honey: "rgb(var(--honey) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        /* 品牌靛蓝光谱（随主题切换色阶） */
        teal: {
          50: "rgb(var(--teal-50) / <alpha-value>)",
          100: "rgb(var(--teal-100) / <alpha-value>)",
          200: "rgb(var(--teal-200) / <alpha-value>)",
          300: "rgb(var(--teal-300) / <alpha-value>)",
          400: "rgb(var(--teal-400) / <alpha-value>)",
          500: "rgb(var(--teal-500) / <alpha-value>)",
          600: "rgb(var(--teal-600) / <alpha-value>)",
          700: "rgb(var(--teal-700) / <alpha-value>)",
          800: "rgb(var(--teal-800) / <alpha-value>)",
          900: "rgb(var(--teal-900) / <alpha-value>)"
        }
      },
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        glow: "var(--shadow-glow)",
        float: "var(--shadow-float)"
      },
      fontFamily: {
        sans: ["var(--font-sans)", '"Microsoft YaHei"', "system-ui", "sans-serif"],
        mono: ['var(--font-mono)', '"Cascadia Mono"', "Consolas", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", '"Microsoft YaHei"', "serif"]
      },
      letterSpacing: {
        tighter2: "-0.045em",
        tight2: "-0.025em"
      },
      transitionTimingFunction: {
        silk: "cubic-bezier(0.22, 1, 0.36, 1)",
        smooth: "cubic-bezier(0.65, 0, 0.35, 1)"
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "clip-reveal": {
          from: { clipPath: "inset(0 0 100% 0)", opacity: "0" },
          to: { clipPath: "inset(0 0 0 0)", opacity: "1" }
        },
        "line-grow": {
          from: { transform: "scaleX(0)" },
          to: { transform: "scaleX(1)" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.6)", opacity: "1" },
          "70%, 100%": { transform: "scale(1.9)", opacity: "0" }
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(220%)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" }
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.9s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) both",
        "clip-reveal": "clip-reveal 1s cubic-bezier(0.22, 1, 0.36, 1) both",
        "line-grow": "line-grow 1.1s cubic-bezier(0.22, 1, 0.36, 1) both",
        shimmer: "shimmer 2.6s cubic-bezier(0.65, 0, 0.35, 1) infinite",
        float: "float 7s ease-in-out infinite",
        "spin-slow": "spin-slow 14s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { ArrowRight, Loader2 } from "lucide-vue-next";
import { apiPost } from "@/lib/api";
import { setSession } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle.vue";

interface LoginResponse {
  token: string;
  username: string;
}

const router = useRouter();
const username = ref("");
const password = ref("");
const error = ref<string | null>(null);
const loading = ref(false);

async function handleSubmit() {
  if (loading.value) return;
  error.value = null;
  loading.value = true;
  try {
    const data = await apiPost<LoginResponse>("/api/auth/login", {
      username: username.value,
      password: password.value
    });
    setSession(data.token, data.username);
    await router.replace("/");
  } catch (err) {
    error.value = err instanceof Error ? err.message : "登录失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center px-4 py-10">
    <div class="glass relative w-full max-w-5xl overflow-hidden rounded-[26px] shadow-float md:grid md:min-h-[560px] md:grid-cols-[1.05fr_1fr]">
      <!-- 品牌区 -->
      <div class="relative hidden flex-col justify-between overflow-hidden border-r border-hair bg-panel/60 p-12 md:flex">
        <div class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div class="absolute inset-0 bg-gradient-to-br from-prism/[0.06] via-transparent to-accent/[0.04]" />
          <div class="absolute -inset-y-20 left-[-30%] w-[26%] rotate-[18deg] bg-gradient-to-r from-transparent via-prism/[0.10] to-transparent blur-[1px]" style="animation: fade-in 1.4s cubic-bezier(0.22,1,0.36,1) 0.1s both" />
          <div class="absolute -inset-y-20 left-[8%] w-[16%] rotate-[18deg] bg-gradient-to-r from-transparent via-accent/[0.14] to-transparent blur-[1px]" style="animation: fade-in 1.4s cubic-bezier(0.22,1,0.36,1) 0.25s both" />
          <div class="absolute -inset-y-20 left-[26%] w-[10%] rotate-[18deg] bg-gradient-to-r from-transparent via-mint/[0.12] to-transparent blur-[1px]" style="animation: fade-in 1.4s cubic-bezier(0.22,1,0.36,1) 0.4s both" />
          <svg class="absolute right-[14%] top-[18%] opacity-50" width="120" height="104" viewBox="0 0 120 104" fill="none" style="animation: float 9s ease-in-out infinite">
            <path d="M60 8L112 96H8L60 8Z" stroke="rgb(var(--prism) / 0.45)" stroke-width="1" stroke-linejoin="round" />
            <path d="M38 54L82 54" stroke="rgb(var(--prism) / 0.25)" stroke-width="1" />
            <path d="M82 54L104 44M82 54L104 54M82 54L104 64" stroke="rgb(var(--prism) / 0.22)" stroke-width="0.8" />
          </svg>
          <div
            class="absolute inset-x-0 bottom-0 h-1/3 opacity-40"
            :style="{
              backgroundImage:
                'linear-gradient(rgb(var(--hair)/0.6) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--hair)/0.6) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'linear-gradient(to top, black, transparent)'
            }"
          />
        </div>

        <div class="relative flex items-start justify-between">
          <svg width="42" height="42" viewBox="0 0 26 26" fill="none" aria-hidden>
            <path d="M13 2L24 21H2L13 2Z" stroke="rgb(var(--prism) / 0.8)" stroke-width="1.4" stroke-linejoin="round" />
            <path d="M13 7L19.5 18.5H6.5L13 7Z" fill="rgb(var(--prism) / 0.18)" />
            <path d="M2 21H24" stroke="rgb(var(--prism) / 0.8)" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <span class="rounded-full border border-hair bg-surface/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mute backdrop-blur">
            v0.1 · Console
          </span>
        </div>

        <div class="relative">
          <h1 class="font-display text-[clamp(3rem,5vw,4.4rem)] font-semibold leading-[0.95] tracking-tighter2 text-ink">
            PR<span class="spectrum-text italic">ism</span>
          </h1>
          <div class="spectrum-rule mt-5 w-24 origin-left animate-line-grow" />
          <p class="mt-6 max-w-sm text-[15px] leading-relaxed text-body">
            一束需求光，折射出完整的工程洞察。
            <span class="text-mute">Issue 分析、PR 审查、CI 排障与知识问答，尽在一个工作台。</span>
          </p>
        </div>

        <div class="relative flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
          <span class="h-px w-8 bg-hair" />
          AI Dev Collaboration Platform
        </div>
      </div>

      <!-- 表单区 -->
      <div class="animate-fade-in relative flex flex-col justify-center bg-surface/80 p-9 sm:p-12">
        <div class="absolute right-6 top-6 md:hidden">
          <ThemeToggle />
        </div>

        <div class="mb-8 md:hidden">
          <div class="font-display text-2xl font-semibold tracking-tight2 text-ink">
            PR<span class="spectrum-text italic">ism</span>
          </div>
        </div>

        <div class="mono-eyebrow">Sign in / 01</div>
        <h2 class="mt-3 font-display text-3xl font-semibold tracking-tight2 text-ink">登录工作台</h2>
        <p class="mt-2.5 text-sm leading-relaxed text-mute">使用管理员账号继续，会话将保存在本机。</p>

        <form class="mt-9 grid gap-5" @submit.prevent="handleSubmit">
          <label class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.08em] text-mute">账号</span>
            <input
              v-model="username"
              autocomplete="username"
              placeholder="admin"
              class="h-12 rounded-xl border border-hair bg-panel/60 px-4 text-sm text-ink placeholder:text-dim transition-all duration-500 ease-silk focus:border-prism/50 focus:bg-surface"
              required
            />
          </label>
          <label class="grid gap-2">
            <span class="text-xs font-medium uppercase tracking-[0.08em] text-mute">密码</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              class="h-12 rounded-xl border border-hair bg-panel/60 px-4 text-sm text-ink placeholder:text-dim transition-all duration-500 ease-silk focus:border-prism/50 focus:bg-surface"
              required
            />
          </label>

          <div
            v-if="error"
            class="animate-fade-up rounded-xl border border-blush/25 bg-blush/[0.06] px-4 py-3 text-sm text-blush"
            role="alert"
          >
            {{ error }}
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="group magnetic sheen mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-prism px-5 text-sm font-medium text-white shadow-lift transition-all duration-500 ease-silk hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <template v-if="loading">
              <Loader2 class="h-4 w-4 animate-spin" />
              登录中…
            </template>
            <template v-else>
              进入工作台
              <ArrowRight :size="16" :stroke-width="1.8" class="transition-transform duration-500 ease-silk group-hover:translate-x-1" />
            </template>
          </button>
        </form>

        <div class="mt-8 flex items-start gap-2 border-t border-hair pt-5 text-xs leading-relaxed text-dim">
          <span class="glow-dot mt-1 shrink-0" />
          <span>
            演示账号 <span class="font-mono text-mute">admin / prism2026</span>
            <span class="mx-1.5 text-hair">·</span>
            可在 <span class="font-mono text-mute">.env</span> 中修改
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

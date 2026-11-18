<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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
} from "lucide-vue-next";
import { clearSession, getToken, getUsername } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle.vue";

const navGroups = [
  {
    label: "协作中枢",
    en: "01 / Core",
    items: [
      { path: "/", label: "工作台", en: "Workspace", icon: Sparkles },
      { path: "/repos", label: "仓库管理", en: "Repos", icon: Database },
      { path: "/action-drafts", label: "操作草稿", en: "Drafts", icon: FilePenLine },
      { path: "/workflow-runs", label: "运行记录", en: "Runs", icon: Workflow }
    ]
  },
  {
    label: "知识智能",
    en: "02 / Intelligence",
    items: [
      { path: "/knowledge", label: "项目知识", en: "Knowledge", icon: BookOpen },
      { path: "/rag", label: "RAG 工作室", en: "RAG Studio", icon: FlaskConical },
      { path: "/code-graph", label: "代码图谱", en: "Code Graph", icon: Network }
    ]
  },
  {
    label: "质量评测",
    en: "03 / Quality",
    items: [
      { path: "/evals", label: "质量评测", en: "Evals", icon: Gauge },
      { path: "/workspaces", label: "报告中心", en: "Reports", icon: FolderGit2 }
    ]
  }
];

const route = useRoute();
const router = useRouter();
const username = ref<string | null>(getUsername());
const checked = ref(false);

const isActive = (href: string) =>
  route.path === href || (href !== "/" && route.path.startsWith(href));

watch(
  () => route.path,
  () => {
    username.value = getUsername();
    if (route.path !== "/login" && !getToken()) {
      router.replace("/login");
      return;
    }
    checked.value = true;
  },
  { immediate: true }
);

const showShell = computed(() => checked.value || route.path === "/login");

function handleLogout() {
  clearSession();
  router.replace("/login");
}
</script>

<template>
  <div v-if="showShell">
    <!-- 桌面端：固定玻璃侧边栏 -->
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-hair bg-surface/70 px-4 py-6 backdrop-blur-xl lg:flex"
    >
      <div>
        <router-link to="/" class="mb-5 flex items-center gap-2.5 px-2">
          <svg width="28" height="28" viewBox="0 0 26 26" fill="none" aria-hidden>
            <defs>
              <linearGradient id="prism-g" x1="3" y1="4" x2="23" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="rgb(var(--teal-400))" />
                <stop offset="0.55" stop-color="rgb(var(--teal-600))" />
                <stop offset="1" stop-color="rgb(var(--orb-b))" />
              </linearGradient>
            </defs>
            <path d="M13 2L24 21H2L13 2Z" stroke="url(#prism-g)" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M13 7L19.5 18.5H6.5L13 7Z" fill="url(#prism-g)" fill-opacity="0.20" />
            <path d="M2 21H24" stroke="url(#prism-g)" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <div class="leading-none">
            <span class="font-display text-[17px] font-semibold tracking-tight2 text-ink">
              PR<span class="spectrum-text italic">ism</span>
            </span>
            <div class="mono-eyebrow mt-1.5 !text-[9px]">AI Dev Collaboration</div>
          </div>
        </router-link>
        <div class="spectrum-rule animate-line-grow mb-6 ml-2 w-16 origin-left opacity-70" />
        <nav class="flex flex-col gap-6">
          <div
            v-for="(group, index) in navGroups"
            :key="group.label"
            :class="clsx('animate-fade-up', `stagger-${index + 1}`)"
          >
            <div class="mb-2.5 flex items-center justify-between px-3">
              <span class="mono-eyebrow">{{ group.label }}</span>
              <span class="font-mono text-[9px] tracking-[0.1em] text-dim/70">{{ group.en }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <router-link
                v-for="item in group.items"
                :key="item.path"
                :to="item.path"
                :class="clsx(
                  'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-500 ease-silk',
                  isActive(item.path)
                    ? 'bg-surface text-ink shadow-card'
                    : 'text-body hover:bg-surface/50 hover:text-ink'
                )"
              >
                <span
                  v-if="isActive(item.path)"
                  class="spectrum-rule absolute -left-3 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full"
                />
                <component
                  :is="item.icon"
                  :size="16"
                  :stroke-width="1.8"
                  :class="clsx('shrink-0 transition-colors duration-500', isActive(item.path) ? 'text-prism' : 'text-dim group-hover:text-mute')"
                />
                <span class="flex min-w-0 flex-1 items-baseline justify-between gap-1.5">
                  <span>{{ item.label }}</span>
                  <span
                    :class="clsx('shrink-0 font-mono text-[9px] uppercase tracking-[0.1em]', isActive(item.path) ? 'text-prism/70' : 'text-dim/70')"
                  >
                    {{ item.en }}
                  </span>
                </span>
              </router-link>
            </div>
          </div>
        </nav>
      </div>
      <div class="rounded-xl border border-hair bg-surface/60 p-3.5">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="glow-dot shrink-0" />
            <div class="min-w-0 leading-tight">
              <div class="break-all text-xs font-medium text-ink">{{ username ?? "已登录" }}</div>
              <div class="font-mono text-[10px] text-dim">owner · 在线</div>
            </div>
          </div>
          <button
            type="button"
            title="退出登录"
            class="magnetic shrink-0 rounded-md p-1.5 text-dim transition-colors duration-300 hover:bg-panel hover:text-blush"
            @click="handleLogout"
          >
            <LogOut :size="14" :stroke-width="1.8" />
          </button>
        </div>
        <div class="mt-3 flex items-center gap-2 border-t border-hair pt-3">
          <ThemeToggle class="h-8 w-8" />
          <span class="font-mono text-[10px] uppercase tracking-[0.12em] text-dim">Appearance</span>
        </div>
      </div>
    </aside>

    <!-- 移动端顶栏 -->
    <header class="sticky top-0 z-30 border-b border-hair bg-surface/85 backdrop-blur-xl lg:hidden">
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <router-link to="/" class="flex items-center gap-2">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden>
            <path d="M13 2L24 21H2L13 2Z" stroke="rgb(var(--prism) / 0.8)" stroke-width="1.4" stroke-linejoin="round" />
            <path d="M13 7L19.5 18.5H6.5L13 7Z" fill="rgb(var(--prism) / 0.18)" />
            <path d="M2 21H24" stroke="rgb(var(--prism) / 0.8)" stroke-width="1.4" stroke-linecap="round" />
          </svg>
          <span class="font-display text-[15px] font-semibold tracking-tight2 text-ink">
            PR<span class="spectrum-text italic">ism</span>
          </span>
        </router-link>
        <ThemeToggle class="h-8 w-8" />
      </div>
      <div class="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-2">
        <router-link
          v-for="item in navGroups.flatMap((g) => g.items)"
          :key="item.path"
          :to="item.path"
          :class="clsx(
            'whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition-colors duration-300',
            isActive(item.path) ? 'bg-surface font-medium text-ink shadow-card' : 'text-body hover:bg-surface/60'
          )"
        >
          {{ item.label }}
        </router-link>
      </div>
    </header>

    <!-- 内容区 -->
    <main class="min-h-screen overflow-x-hidden px-3 py-3 lg:ml-64 lg:px-5 lg:py-5 xl:px-7">
      <slot />
    </main>
  </div>
</template>

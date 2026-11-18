<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { Blocks } from "lucide-vue-next";

const route = useRoute();
const title = computed(() => String(route.meta.title ?? "页面"));
</script>

<template>
  <div class="animate-fade-up flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-2xl border border-hair bg-surface/60 shadow-card">
    <div class="flex h-12 w-12 items-center justify-center rounded-xl border border-hair bg-panel/70 text-prism">
      <Blocks :size="22" :stroke-width="1.8" />
    </div>
    <div class="text-center">
      <h1 class="font-display text-xl font-semibold tracking-tight2 text-ink">{{ title }}</h1>
      <p class="mt-2 max-w-md text-sm leading-relaxed text-mute">
        Vue 栈页面由子应用独立实现，与 React 栈共享同一套后端 API 与设计系统。
      </p>
    </div>
    <div class="mono-eyebrow">vue / 3010 · under construction</div>
  </div>
</template>

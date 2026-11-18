<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppShell from "@/components/layout/AppShell.vue";

const route = useRoute();
const isLogin = computed(() => route.path === "/login");
</script>

<template>
  <!-- 环境光层（固定背景，不随滚动） -->
  <div class="ambient-root" aria-hidden>
    <div class="ambient-grid" />
    <div class="ambient-orb ambient-orb-indigo" />
    <div class="ambient-orb ambient-orb-cyan" />
    <div class="ambient-beam" />
    <div class="ambient-grain" />
  </div>

  <div :style="{ '--font-sans': `'IBM Plex Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif`, '--font-mono': `'IBM Plex Mono', 'Cascadia Mono', Consolas, monospace`, '--font-display': `'Fraunces', Georgia, serif` }">
    <AppShell v-if="!isLogin">
      <router-view />
    </AppShell>
    <router-view v-else />
  </div>
</template>

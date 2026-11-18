<script setup lang="ts">
import { Moon, Sun } from "lucide-vue-next";
import { useTheme } from "@/lib/theme";

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <button
    type="button"
    :title="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
    :aria-label="theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'"
    class="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-hair bg-surface/70 text-mute transition-all duration-500 ease-silk hover:border-prism/40 hover:text-prism"
    @click="toggleTheme"
  >
    <Sun
      :size="16"
      :stroke-width="1.8"
      :class="['absolute transition-all duration-500 ease-silk', theme === 'dark' ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100']"
    />
    <Moon
      :size="16"
      :stroke-width="1.8"
      :class="['absolute transition-all duration-500 ease-silk', theme === 'dark' ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0']"
    />
  </button>
</template>

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// base=/v/：为 Phase 3 wujie 子应用挂载预留
export default defineConfig({
  plugins: [vue()],
  base: "/v/",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 3010,
    strictPort: true,
    host: true
  },
  preview: {
    port: 3010,
    strictPort: true
  }
});

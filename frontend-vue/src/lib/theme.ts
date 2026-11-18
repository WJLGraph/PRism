import { ref } from "vue";

const THEME_KEY = "prism-theme";
const theme = ref<"light" | "dark">(document.documentElement.dataset.theme === "dark" ? "dark" : "light");

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = theme.value;
    document.documentElement.style.colorScheme = theme.value;
    try {
      localStorage.setItem(THEME_KEY, theme.value);
    } catch {
      /* 忽略私有模式写入失败 */
    }
  }
  return { theme, toggleTheme };
}

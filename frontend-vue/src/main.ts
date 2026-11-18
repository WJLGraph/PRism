import { createApp } from "vue";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";

import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/600-italic.css";
import "./styles/globals.css";

const app = createApp(App);
app.use(router);
app.use(VueQueryPlugin, {
  queryClientConfig: {
    defaultOptions: {
      queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 }
    }
  }
});
app.mount("#app");

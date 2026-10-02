import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";

const queryClient = new QueryClient();

createApp(App)
  .use(router)
  .use(VueQueryPlugin, { queryClient })
  .mount("#app");

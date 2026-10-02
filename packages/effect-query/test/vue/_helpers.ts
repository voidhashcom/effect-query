import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import { render } from "vitest-browser-vue";
import { defineComponent, h } from "vue";

/** Runs a composable inside a mounted component that has the vue-query plugin installed. */
export async function withSetup<TResult>(
  composable: () => TResult,
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
) {
  let result: TResult | undefined;
  const Component = defineComponent({
    render: () => h("div"),
    setup() {
      result = composable();
    },
  });
  await render(Component, {
    global: { plugins: [[VueQueryPlugin, { queryClient }]] },
  });
  return { queryClient, result: result as TResult };
}

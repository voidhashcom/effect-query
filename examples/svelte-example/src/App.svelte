<script lang="ts">
  import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
  import BaseMutation from "./routes/BaseMutation.svelte";
  import BaseQuery from "./routes/BaseQuery.svelte";
  import Home from "./routes/Home.svelte";
  import InfiniteQuery from "./routes/InfiniteQuery.svelte";
  import RpcMutation from "./routes/RpcMutation.svelte";
  import RpcQuery from "./routes/RpcQuery.svelte";

  const queryClient = new QueryClient();

  const routes = {
    "/examples/base/base-mutation": BaseMutation,
    "/examples/base/base-query": BaseQuery,
    "/examples/infinite/infinite-query": InfiniteQuery,
    "/examples/rpc/rpc-mutation": RpcMutation,
    "/examples/rpc/rpc-query": RpcQuery,
  } as const;

  const Route = routes[window.location.pathname as keyof typeof routes] ?? Home;
</script>

<QueryClientProvider client={queryClient}>
  <main>
    <a href="/">Home</a>
    <Route />
  </main>
</QueryClientProvider>

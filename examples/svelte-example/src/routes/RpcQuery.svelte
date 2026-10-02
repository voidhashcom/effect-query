<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import { Effect } from "effect";
  import { ExampleRpcClient, rpcEq } from "../lib/effect-rpc-example";

  const greetingName = "Voyager";

  const query = createQuery(() =>
    rpcEq.queryOptions({
      queryFn: () =>
        Effect.gen(function* () {
          const rpcClient = yield* ExampleRpcClient;
          return yield* rpcClient.GetGreeting({ name: greetingName });
        }),
      queryKey: ["rpc", "get-greeting", greetingName],
    })
  );
</script>

<div>
  <p>
    Uses an Effect RPC client backed by a local `RpcGroup` through
    `RpcTest.makeClient`.
  </p>
  {#if query.isPending}
    <div>Loading...</div>
  {:else if query.isSuccess}
    <div>{query.data}</div>
  {/if}
</div>

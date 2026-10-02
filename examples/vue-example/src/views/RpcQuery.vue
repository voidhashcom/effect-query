<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { Effect } from "effect";
import { ExampleRpcClient, rpcEq } from "../lib/effect-rpc-example";

const greetingName = "Voyager";

const { data, status } = useQuery(
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

<template>
  <div>
    <p>
      Uses an Effect RPC client backed by a local `RpcGroup` through
      `RpcTest.makeClient`.
    </p>
    <div v-if="status === 'pending'">Loading...</div>
    <div v-else-if="status === 'success'">{{ data }}</div>
  </div>
</template>

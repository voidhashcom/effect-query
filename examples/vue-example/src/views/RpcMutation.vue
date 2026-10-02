<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
import { Cause, Effect } from "effect";
import { ref } from "vue";
import { ExampleRpcClient, rpcEq } from "../lib/effect-rpc-example";

const errorMessage = ref("");

const { data, mutate, status } = useMutation(
  rpcEq.mutationOptions({
    mutationFn: (variables: { id: string; name: string }) =>
      Effect.gen(function* () {
        const rpcClient = yield* ExampleRpcClient;
        return yield* rpcClient.RenameUser(variables);
      }),
    mutationKey: ["rpc", "rename-user"],
    onError: (error) => {
      errorMessage.value = error.match({
        OrElse: (cause) => `Error renaming user: ${Cause.pretty(cause)}`,
        RenameUserError: (renameUserError) => renameUserError.message,
      });
    },
    onMutate: () => {
      errorMessage.value = "";
    },
  })
);
</script>

<template>
  <div>
    <p>Uses the same Effect RPC client inside a mutation.</p>
    <button type="button" @click="mutate({ id: 'user-123', name: 'Ripley' })">
      Rename to Ripley
    </button>
    <button type="button" @click="mutate({ id: 'user-123', name: 'HAL' })">
      Rename to HAL
    </button>
    <div v-if="status === 'pending'">Updating...</div>
    <div v-else-if="status === 'success'">{{ data }}</div>
    <div v-if="errorMessage">{{ errorMessage }}</div>
  </div>
</template>

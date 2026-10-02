<script lang="ts">
  import { createMutation } from "@tanstack/svelte-query";
  import { Cause, Effect } from "effect";
  import { ExampleRpcClient, rpcEq } from "../lib/effect-rpc-example";

  let errorMessage = $state("");

  const mutation = createMutation(() =>
    rpcEq.mutationOptions({
      mutationFn: (variables: { id: string; name: string }) =>
        Effect.gen(function* () {
          const rpcClient = yield* ExampleRpcClient;
          return yield* rpcClient.RenameUser(variables);
        }),
      mutationKey: ["rpc", "rename-user"],
      onError: (error) => {
        errorMessage = error.match({
          OrElse: (cause) => `Error renaming user: ${Cause.pretty(cause)}`,
          RenameUserError: (renameUserError) => renameUserError.message,
        });
      },
      onMutate: () => {
        errorMessage = "";
      },
    })
  );
</script>

<div>
  <p>Uses the same Effect RPC client inside a mutation.</p>
  <button
    onclick={() => mutation.mutate({ id: "user-123", name: "Ripley" })}
    type="button"
  >
    Rename to Ripley
  </button>
  <button
    onclick={() => mutation.mutate({ id: "user-123", name: "HAL" })}
    type="button"
  >
    Rename to HAL
  </button>
  {#if mutation.isPending}
    <div>Updating...</div>
  {:else if mutation.isSuccess}
    <div>{mutation.data}</div>
  {/if}
  {#if errorMessage}
    <div>{errorMessage}</div>
  {/if}
</div>

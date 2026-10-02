import { useMutation } from "@tanstack/solid-query";
import { Cause, Effect } from "effect";
import { createSignal, Show } from "solid-js";
import { ExampleRpcClient, rpcEq } from "../lib/effect-rpc-example";

export default function RpcMutation() {
  const [errorMessage, setErrorMessage] = createSignal("");

  const mutation = useMutation(() =>
    rpcEq.mutationOptions({
      mutationFn: (variables: { id: string; name: string }) =>
        Effect.gen(function* () {
          const rpcClient = yield* ExampleRpcClient;
          return yield* rpcClient.RenameUser(variables);
        }),
      mutationKey: ["rpc", "rename-user"],
      onError: (error) =>
        setErrorMessage(
          error.match({
            OrElse: (cause) => `Error renaming user: ${Cause.pretty(cause)}`,
            RenameUserError: (renameUserError) => renameUserError.message,
          })
        ),
      onMutate: () => setErrorMessage(""),
    })
  );

  return (
    <div>
      <p>Uses the same Effect RPC client inside a mutation.</p>
      <button
        onClick={() => mutation.mutate({ id: "user-123", name: "Ripley" })}
        type="button"
      >
        Rename to Ripley
      </button>
      <button
        onClick={() => mutation.mutate({ id: "user-123", name: "HAL" })}
        type="button"
      >
        Rename to HAL
      </button>
      <Show when={mutation.isPending}>
        <div>Updating...</div>
      </Show>
      <Show when={mutation.data}>{(data) => <div>{data()}</div>}</Show>
      <Show when={errorMessage()}>
        <div>{errorMessage()}</div>
      </Show>
    </div>
  );
}

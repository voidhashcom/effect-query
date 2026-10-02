/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
/** biome-ignore-all lint/suspicious/noAlert: dev example */
import { useMutation } from "@tanstack/react-query";
import { Cause, Effect } from "effect";
import { useCallback } from "react";
import { ExampleRpcClient, rpcEq } from "~/lib/effect-rpc-example";

const renameUserOptions = rpcEq.mutationOptions({
  mutationFn: (variables: { id: string; name: string }) =>
    Effect.gen(function* () {
      const rpcClient = yield* ExampleRpcClient;
      return yield* rpcClient.RenameUser(variables);
    }),
  mutationKey: ["rpc", "rename-user"],
});

export default function RpcMutationRoute() {
  const { data, mutate, status } = useMutation({
    ...renameUserOptions,
    onError: (error) =>
      error.match({
        OrElse: (cause) => {
          alert(`Error renaming user: ${Cause.pretty(cause)}`);
        },
        RenameUserError: (renameUserError) => {
          alert(renameUserError.message);
        },
      }),
  });

  const renameToRipley = useCallback(
    () => mutate({ id: "user-123", name: "Ripley" }),
    [mutate]
  );
  const renameToHal = useCallback(
    () => mutate({ id: "user-123", name: "HAL" }),
    [mutate]
  );

  return (
    <div>
      <p>Uses the same Effect RPC client inside a mutation.</p>
      <button onClick={renameToRipley} type="button">
        Rename to Ripley
      </button>
      <button onClick={renameToHal} type="button">
        Rename to HAL
      </button>
      {status === "pending" && <div>Updating...</div>}
      {status === "success" && data && <div>{data}</div>}
    </div>
  );
}

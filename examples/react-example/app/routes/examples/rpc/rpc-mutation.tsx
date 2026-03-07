/** biome-ignore-all lint/suspicious/noAlert: dev example */
import { useMutation } from "@tanstack/react-query";
import { Cause, Effect } from "effect";
import { ExampleRpcClient, rpcEq } from "~/lib/effect-rpc-example";

const renameUserOptions = rpcEq.mutationOptions({
  mutationKey: ["rpc", "rename-user"],
  mutationFn: (variables: { id: string; name: string }) =>
    Effect.gen(function* () {
      const rpcClient = yield* ExampleRpcClient;
      return yield* rpcClient.RenameUser(variables);
    }),
});

export default function RpcMutationRoute() {
  const { data, mutate, status } = useMutation({
    ...renameUserOptions,
    onError: (error) =>
      error.match({
        RenameUserError: (renameUserError) => {
          alert(renameUserError.message);
        },
        OrElse: (cause) => {
          alert(`Error renaming user: ${Cause.pretty(cause)}`);
        },
      }),
  });

  return (
    <div>
      <p>Uses the same Effect RPC client inside a mutation.</p>
      <button
        onClick={() =>
          mutate({
            id: "user-123",
            name: "Ripley",
          })
        }
        type="button"
      >
        Rename to Ripley
      </button>
      <button
        onClick={() =>
          mutate({
            id: "user-123",
            name: "HAL",
          })
        }
        type="button"
      >
        Rename to HAL
      </button>
      {status === "pending" && <div>Updating...</div>}
      {status === "success" && data && <div>{data}</div>}
    </div>
  );
}

import { useQuery } from "@tanstack/solid-query";
import { Effect } from "effect";
import { Show } from "solid-js";
import { ExampleRpcClient, rpcEq } from "../lib/effect-rpc-example";

const greetingName = "Voyager";

const greetingQueryOptions = rpcEq.queryOptions({
  queryFn: () =>
    Effect.gen(function* () {
      const rpcClient = yield* ExampleRpcClient;
      return yield* rpcClient.GetGreeting({ name: greetingName });
    }),
  queryKey: ["rpc", "get-greeting", greetingName],
});

export default function RpcQuery() {
  const query = useQuery(() => greetingQueryOptions);

  return (
    <div>
      <p>
        Uses an Effect RPC client backed by a local `RpcGroup` through
        `RpcTest.makeClient`.
      </p>
      <Show fallback={<div>Loading...</div>} when={query.data}>
        {(data) => <div>{data()}</div>}
      </Show>
    </div>
  );
}

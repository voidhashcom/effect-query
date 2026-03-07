import { useQuery } from "@tanstack/react-query";
import { Effect } from "effect";
import { ExampleRpcClient, rpcEq } from "~/lib/effect-rpc-example";

const greetingName = "Voyager";

const greetingQueryOptions = rpcEq.queryOptions({
  queryKey: ["rpc", "get-greeting", greetingName],
  queryFn: () =>
    Effect.gen(function* () {
      const rpcClient = yield* ExampleRpcClient;
      return yield* rpcClient.GetGreeting({
        name: greetingName,
      });
    }),
});

export default function RpcQueryRoute() {
  const { data, status } = useQuery(greetingQueryOptions);

  return (
    <div>
      <p>
        Uses an Effect RPC client backed by a local `RpcGroup` through
        `RpcTest.makeClient`.
      </p>
      {status === "pending" && <div>Loading...</div>}
      {status === "success" && <div>{data}</div>}
    </div>
  );
}

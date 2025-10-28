/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */

import { createEffectQuery } from "@effect-query/solid";
import { useQuery } from "@tanstack/solid-query";
import { Cause, Data, Effect, Layer } from "effect";
import { Match, Switch } from "solid-js";

class QueryError extends Data.TaggedError("QueryError")<{ hello: string }> {}
class TestError extends Data.TaggedError("TestError")<{ message: string }> {}
export const eq = createEffectQuery(Layer.empty);

export default function BaseQueryRoute() {
  const query = useQuery(
    eq.queryOptions({
      queryKey: ["namespace", "action"],
      queryFn: () =>
        Effect.gen(function* () {
          if (Math.random() < 0.5) {
            return yield* Effect.fail(new QueryError({ hello: "world" }));
          }
          if (Math.random() < 0.5) {
            return yield* Effect.fail(new TestError({ message: "Test error" }));
          }
          return "Hello, world!";
        }),
    })
  );

  return (
    <div>
      <Switch>
        <Match when={query.status === "error" && query.error}>
          {query.error?.match({
            // TestError: (testError) => <div>Test error: {testError.message}</div>,
            QueryError: (queryError) => (
              <div>Query error: {queryError.hello}</div>
            ),
            OrElse: (cause) => <div>Error: {Cause.pretty(cause)}</div>,
          })}
        </Match>
        <Match when={query.status === "pending"}>
          <div>Loading...</div>
        </Match>
        <Match when={query.status === "success"}>
          <div>{query.data}</div>
        </Match>
      </Switch>
    </div>
  );
}

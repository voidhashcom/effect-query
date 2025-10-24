/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
import { useQuery } from "@tanstack/react-query";
import { Cause, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query";

class QueryError extends Data.TaggedError("QueryError")<{ hello: string }> {}
class TestError extends Data.TaggedError("TestError")<{ message: string }> {}
export const eq = createEffectQuery(Layer.empty);
export default function HomeRoute() {
  const { data, status, error } = useQuery(
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

  if (status === "error" && error) {
    return error.match({
      // TestError: (testError) => <div>Test error: {testError.message}</div>,
      QueryError: (queryError) => <div>Query error: {queryError.hello}</div>,
      OrElse: (cause) => <div>Error: {Cause.pretty(cause)}</div>,
    });
  }

  return (
    <div>
      {status === "pending" && <div>Loading...</div>}
      {status === "success" && <div>{data}</div>}
    </div>
  );
}

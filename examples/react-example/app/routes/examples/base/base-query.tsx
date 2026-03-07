/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
import { useQuery } from "@tanstack/react-query";
import { Cause, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query";

class QueryError extends Data.TaggedError("QueryError")<{ hello: string }> {}
class TestError extends Data.TaggedError("TestError")<{ message: string }> {}
export const eq = createEffectQuery(Layer.empty);

const queryOptions = eq.queryOptions({
  queryKey: ["namespace"] as const,
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
});

export default function HomeRoute() {
  const { data, error, isPending, isSuccess } = useQuery(queryOptions);

  // Usage with suspense
  // const suspenseQueryOptions = useSuspenseQuery(queryOptions);

  if (error) {
    return error.match({
      TestError: (testError) => <div>Test error: {testError.message}</div>,
      QueryError: (queryError) => <div>Query error: {queryError.hello}</div>,
      OrElse: (cause) => <div>Error: {Cause.pretty(cause)}</div>,
    });
  }

  return (
    <div>
      {isPending && <div>Loading...</div>}
      {isSuccess && <div>{data}</div>}
    </div>
  );
}

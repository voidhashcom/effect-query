/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
import { useQuery } from "@tanstack/react-query";
import { Cause, Data, Effect, Layer, ServiceMap } from "effect";
import { createEffectQuery } from "effect-query";

class QueryError extends Data.TaggedError("QueryError")<{ hello: string }> {}
class TestError extends Data.TaggedError("TestError")<{ message: string }> {}

class GreetingApi extends ServiceMap.Service<
  GreetingApi,
  {
    readonly loadGreeting: () => Effect.Effect<
      string,
      QueryError | TestError
    >;
  }
>()("example/GreetingApi") {}

const GreetingApiLive = Layer.succeed(GreetingApi)({
  loadGreeting: () =>
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

export const eq = createEffectQuery(GreetingApiLive);

const queryOptions = eq.queryOptions({
  queryKey: ["namespace"],
  queryFn: () =>
    Effect.gen(function* () {
      const greetingApi = yield* GreetingApi;
      return yield* greetingApi.loadGreeting();
    }),
});

export default function HomeRoute() {
  const { data, status, error } = useQuery(queryOptions);

  // Usage with suspense
  // const suspenseQueryOptions = useSuspenseQuery(queryOptions);

  if (status === "error" && error) {
    return error.match({
      // TestError: (testError) => <div>Test error: {testError.message}</div>,
      QueryError: (queryError) => <div>Query error: {queryError.hello}</div>,
      OrElse: (cause) => <div>Error: {Cause.pretty(cause)}</div>,
    });
  }

  return (
    <div>
      <p>Uses a `ServiceMap.Service` provided through a v4 `Layer`.</p>
      {status === "pending" && <div>Loading...</div>}
      {status === "success" && <div>{data}</div>}
    </div>
  );
}

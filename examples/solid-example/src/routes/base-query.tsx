import { useQuery } from "@tanstack/solid-query";
import { Cause, Context, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query/solid";
import { createSignal, Match, Switch } from "solid-js";

class QueryError extends Data.TaggedError("QueryError")<{ hello: string }> {}
class TestError extends Data.TaggedError("TestError")<{ message: string }> {}

class GreetingApi extends Context.Service<
  GreetingApi,
  {
    readonly loadGreeting: (
      name: string
    ) => Effect.Effect<string, QueryError | TestError>;
  }
>()("example/GreetingApi") {}

const GreetingApiLive = Layer.succeed(GreetingApi)({
  loadGreeting: (name) =>
    Effect.gen(function* () {
      yield* Effect.sleep("300 millis");
      if (name === "") {
        return yield* Effect.fail(new QueryError({ hello: "world" }));
      }
      if (name === "error") {
        return yield* Effect.fail(new TestError({ message: "Test error" }));
      }
      return `Hello, ${name}!`;
    }),
});

const eq = createEffectQuery(GreetingApiLive);

export default function BaseQuery() {
  const [name, setName] = createSignal("world");

  // `query.data` is `string | undefined`
  // `query.error` is `EffectQueryFailure<QueryError | TestError> | EffectQueryDefect<unknown> | null`
  const query = useQuery(() =>
    eq.queryOptions({
      queryFn: ({ queryKey }) =>
        Effect.gen(function* () {
          const greetingApi = yield* GreetingApi;
          return yield* greetingApi.loadGreeting(queryKey[1]);
        }),
      queryKey: ["greeting", name()] as const,
      retry: false,
    })
  );

  return (
    <div>
      <p>Uses a `Context.Service` provided through a `Layer`.</p>
      <p>
        Type <code>error</code> or clear the input to see typed failures.
      </p>
      <input
        aria-label="Name"
        onInput={(event) => setName(event.currentTarget.value)}
        value={name()}
      />
      <Switch>
        <Match when={query.isPending}>
          <div>Loading...</div>
        </Match>
        <Match when={query.error}>
          {(error) => (
            <div>
              {error().match({
                OrElse: (cause) => `Error: ${Cause.pretty(cause)}`,
                QueryError: (queryError) => `Query error: ${queryError.hello}`,
                TestError: (testError) => `Test error: ${testError.message}`,
              })}
            </div>
          )}
        </Match>
        <Match when={query.data}>
          {(data) => <div>{data().toUpperCase()}</div>}
        </Match>
      </Switch>
    </div>
  );
}

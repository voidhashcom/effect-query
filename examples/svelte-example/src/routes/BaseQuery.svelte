<script lang="ts">
  import { createQuery } from "@tanstack/svelte-query";
  import { Cause, Context, Data, Effect, Layer } from "effect";
  import { createEffectQuery } from "effect-query/svelte";

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

  let name = $state("world");

  // `query.data` is `string | undefined`
  // `query.error` is `EffectQueryFailure<QueryError | TestError> | EffectQueryDefect<unknown> | null`
  const query = createQuery(() =>
    eq.queryOptions({
      queryFn: ({ queryKey }) =>
        Effect.gen(function* () {
          const greetingApi = yield* GreetingApi;
          return yield* greetingApi.loadGreeting(queryKey[1]);
        }),
      queryKey: ["greeting", name] as const,
      retry: false,
    })
  );

  const errorMessage = $derived(
    query.error?.match({
      OrElse: (cause) => `Error: ${Cause.pretty(cause)}`,
      QueryError: (queryError) => `Query error: ${queryError.hello}`,
      TestError: (testError) => `Test error: ${testError.message}`,
    })
  );
</script>

<div>
  <p>Uses a `Context.Service` provided through a `Layer`.</p>
  <p>Type <code>error</code> or clear the input to see typed failures.</p>
  <input aria-label="Name" bind:value={name} />
  {#if query.isPending}
    <div>Loading...</div>
  {:else if errorMessage}
    <div>{errorMessage}</div>
  {:else if query.data}
    <div>{query.data.toUpperCase()}</div>
  {/if}
</div>

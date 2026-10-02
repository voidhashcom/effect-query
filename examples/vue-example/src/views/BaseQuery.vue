<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { Cause, Context, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query/vue";
import { computed, ref } from "vue";

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

const name = ref("world");

// Pass a getter to `useQuery` so the options are recomputed when `name` changes.
// `data` is `Ref<string | undefined>`
// `error` is `Ref<EffectQueryFailure<QueryError | TestError> | EffectQueryDefect<unknown> | null>`
const { data, error, status } = useQuery(() =>
  eq.queryOptions({
    queryFn: () =>
      Effect.gen(function* () {
        const greetingApi = yield* GreetingApi;
        return yield* greetingApi.loadGreeting(name.value);
      }),
    queryKey: ["greeting", name.value],
    retry: false,
  })
);

const errorMessage = computed(() =>
  error.value?.match({
    OrElse: (cause) => `Error: ${Cause.pretty(cause)}`,
    QueryError: (queryError) => `Query error: ${queryError.hello}`,
    TestError: (testError) => `Test error: ${testError.message}`,
  })
);
</script>

<template>
  <div>
    <p>Uses a `Context.Service` provided through a `Layer`.</p>
    <p>
      Type <code>error</code> or clear the input to see typed failures.
    </p>
    <input v-model="name" aria-label="Name" />
    <div v-if="status === 'pending'">Loading...</div>
    <div v-else-if="errorMessage">{{ errorMessage }}</div>
    <div v-else>{{ data?.toUpperCase() }}</div>
  </div>
</template>

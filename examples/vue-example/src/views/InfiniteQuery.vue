<script setup lang="ts">
import { useInfiniteQuery } from "@tanstack/vue-query";
import { Cause, Context, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query/vue";
import { computed } from "vue";

class PageLimitError extends Data.TaggedError("PageLimitError")<{
  limit: number;
}> {}

const pageSize = 3;
const pageLimit = 3;

class ShipsApi extends Context.Service<
  ShipsApi,
  {
    readonly listShips: (
      cursor: number
    ) => Effect.Effect<{ ships: string[]; next: number }, PageLimitError>;
  }
>()("example/ShipsApi") {}

const ShipsApiLive = Layer.succeed(ShipsApi)({
  listShips: (cursor) =>
    Effect.gen(function* () {
      yield* Effect.sleep("300 millis");
      if (cursor >= pageLimit) {
        return yield* Effect.fail(new PageLimitError({ limit: pageLimit }));
      }
      const ships = Array.from(
        { length: pageSize },
        (_, index) => `Ship #${cursor * pageSize + index + 1}`
      );
      return { next: cursor + 1, ships };
    }),
});

const eq = createEffectQuery(ShipsApiLive);

// `data` is `Ref<InfiniteData<{ ships: string[]; next: number }> | undefined>`
// `error` is `Ref<EffectQueryFailure<PageLimitError> | EffectQueryDefect<unknown> | null>`
const { data, error, fetchNextPage, isFetchingNextPage, status } =
  useInfiniteQuery(
    eq.infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.next,
      initialPageParam: 0,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        Effect.gen(function* () {
          const shipsApi = yield* ShipsApi;
          return yield* shipsApi.listShips(pageParam);
        }),
      queryKey: ["ships"],
      retry: false,
    })
  );

const errorMessage = computed(() =>
  error.value?.match({
    OrElse: (cause) => `Error: ${Cause.pretty(cause)}`,
    PageLimitError: (pageLimitError) =>
      `No more than ${pageLimitError.limit} pages.`,
  })
);
</script>

<template>
  <div>
    <p>Pages are loaded by an Effect, until it fails with a typed error.</p>
    <div v-if="status === 'pending'">Loading...</div>
    <ul v-if="data">
      <template v-for="page in data.pages" :key="page.next">
        <li v-for="ship in page.ships" :key="ship">{{ ship }}</li>
      </template>
    </ul>
    <div v-if="errorMessage">{{ errorMessage }}</div>
    <button type="button" :disabled="isFetchingNextPage" @click="fetchNextPage()">
      {{ isFetchingNextPage ? "Loading more..." : "Load more" }}
    </button>
  </div>
</template>

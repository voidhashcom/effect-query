<script lang="ts">
  import { createInfiniteQuery } from "@tanstack/svelte-query";
  import { Cause, Context, Data, Effect, Layer } from "effect";
  import { createEffectQuery } from "effect-query/svelte";

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

  // `query.data` is `InfiniteData<{ ships: string[]; next: number }> | undefined`
  // `query.error` is `EffectQueryFailure<PageLimitError> | EffectQueryDefect<unknown> | null`
  const query = createInfiniteQuery(() =>
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

  const ships = $derived(query.data?.pages.flatMap((page) => page.ships) ?? []);
  const errorMessage = $derived(
    query.error?.match({
      OrElse: (cause) => `Error: ${Cause.pretty(cause)}`,
      PageLimitError: (pageLimitError) =>
        `No more than ${pageLimitError.limit} pages.`,
    })
  );
</script>

<div>
  <p>Pages are loaded by an Effect, until it fails with a typed error.</p>
  {#if query.isPending}
    <div>Loading...</div>
  {/if}
  <ul>
    {#each ships as ship (ship)}
      <li>{ship}</li>
    {/each}
  </ul>
  {#if errorMessage}
    <div>{errorMessage}</div>
  {/if}
  <button
    disabled={query.isFetchingNextPage}
    onclick={() => query.fetchNextPage()}
    type="button"
  >
    {query.isFetchingNextPage ? "Loading more..." : "Load more"}
  </button>
</div>

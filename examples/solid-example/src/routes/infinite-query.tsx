import { useInfiniteQuery } from "@tanstack/solid-query";
import { Cause, Context, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query/solid";
import { For, Show } from "solid-js";

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

const shipsOptions = eq.infiniteQueryOptions({
  getNextPageParam: (lastPage) => lastPage.next,
  initialPageParam: 0,
  queryFn: ({ pageParam }: { pageParam: number }) =>
    Effect.gen(function* () {
      const shipsApi = yield* ShipsApi;
      return yield* shipsApi.listShips(pageParam);
    }),
  queryKey: ["ships"],
  retry: false,
});

export default function InfiniteQuery() {
  // `query.data` is `InfiniteData<{ ships: string[]; next: number }> | undefined`
  // `query.error` is `EffectQueryFailure<PageLimitError> | EffectQueryDefect<unknown> | null`
  const query = useInfiniteQuery(() => shipsOptions);

  return (
    <div>
      <p>Pages are loaded by an Effect, until it fails with a typed error.</p>
      <Show when={query.isPending}>
        <div>Loading...</div>
      </Show>
      <ul>
        <For each={query.data?.pages.flatMap((page) => page.ships)}>
          {(ship) => <li>{ship}</li>}
        </For>
      </ul>
      <Show when={query.error}>
        {(error) => (
          <div>
            {error().match({
              OrElse: (cause) => `Error: ${Cause.pretty(cause)}`,
              PageLimitError: (pageLimitError) =>
                `No more than ${pageLimitError.limit} pages.`,
            })}
          </div>
        )}
      </Show>
      <button
        disabled={query.isFetchingNextPage}
        onClick={() => query.fetchNextPage()}
        type="button"
      >
        {query.isFetchingNextPage ? "Loading more..." : "Load more"}
      </button>
    </div>
  );
}

/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
import { useInfiniteQuery } from "@tanstack/react-query";
import { Cause, Context, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query";
import { useCallback } from "react";

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

export default function InfiniteQueryRoute() {
  // `data` is `InfiniteData<{ ships: string[]; next: number }>`
  // `error` is `EffectQueryFailure<PageLimitError> | EffectQueryDefect<unknown> | null`
  const { data, error, fetchNextPage, isFetchingNextPage, status } =
    useInfiniteQuery(shipsOptions);
  const loadMore = useCallback(() => fetchNextPage(), [fetchNextPage]);

  return (
    <div>
      <p>Pages are loaded by an Effect, until it fails with a typed error.</p>
      {status === "pending" && <div>Loading...</div>}
      {status === "success" && (
        <ul>
          {data.pages
            .flatMap((page) => page.ships)
            .map((ship) => (
              <li key={ship}>{ship}</li>
            ))}
        </ul>
      )}
      {error?.match({
        OrElse: (cause) => <div>Error: {Cause.pretty(cause)}</div>,
        PageLimitError: (pageLimitError) => (
          <div>No more than {pageLimitError.limit} pages.</div>
        ),
      })}
      <button disabled={isFetchingNextPage} onClick={loadMore} type="button">
        {isFetchingNextPage ? "Loading more..." : "Load more"}
      </button>
    </div>
  );
}

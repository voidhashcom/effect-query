import {
  skipToken,
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { Data, Effect, Layer } from "effect";
import { describe, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { createEffectQuery, EffectQueryFailure } from "../../src";
import { createWrapper } from "./_helpers";

class PageNotFound extends Data.TaggedError("PageNotFound")<{
  page: number;
}> {}

interface Page {
  readonly items: readonly string[];
  readonly next: number | null;
}

const LAST_PAGE = 2;

interface PagesData {
  readonly pageParams: readonly unknown[];
  readonly pages: readonly Page[];
}

const pagesOf = (data: PagesData | undefined): readonly Page[] =>
  data?.pages ?? [];

const pageParamsOf = (data: PagesData | undefined): readonly unknown[] =>
  data?.pageParams ?? [];

const fetchPage = (page: number): Effect.Effect<Page, PageNotFound> =>
  page > LAST_PAGE
    ? Effect.fail(new PageNotFound({ page }))
    : Effect.succeed({
        items: [`item-${page}-a`, `item-${page}-b`],
        next: page < LAST_PAGE ? page + 1 : null,
      });

describe("infiniteQueryOptions", () => {
  const eq = createEffectQuery(Layer.empty);

  test("passes the page param to the Effect and fetches the next pages", async () => {
    const queryFn = vi.fn(({ pageParam }: { pageParam: number }) =>
      fetchPage(pageParam)
    );
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useInfiniteQuery(
          eq.infiniteQueryOptions({
            getNextPageParam: (lastPage) => lastPage.next,
            initialPageParam: 0,
            queryFn,
            queryKey: ["pages"],
          })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(pagesOf(result.current.data).map((page) => page.items[0])).toEqual([
      "item-0-a",
    ]);
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();
    await vi.waitFor(() =>
      expect(pagesOf(result.current.data)).toHaveLength(2)
    );
    await result.current.fetchNextPage();
    await vi.waitFor(() =>
      expect(pagesOf(result.current.data)).toHaveLength(3)
    );

    expect(pageParamsOf(result.current.data)).toEqual([0, 1, 2]);
    expect(result.current.hasNextPage).toBe(false);
    expect(queryFn.mock.calls.map(([context]) => context.pageParam)).toEqual([
      0, 1, 2,
    ]);
  });

  test("a failing page becomes a typed EffectQueryFailure", async () => {
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useInfiniteQuery(
          eq.infiniteQueryOptions({
            getNextPageParam: () => LAST_PAGE + 1,
            initialPageParam: LAST_PAGE + 1,
            queryFn: ({ pageParam }) => fetchPage(pageParam),
            queryKey: ["missing-page"],
          })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    const { error } = result.current;
    expect(error).toBeInstanceOf(EffectQueryFailure);
    expect(
      error?.match({
        OrElse: () => -1,
        PageNotFound: (failure) => failure.page,
      })
    ).toBe(LAST_PAGE + 1);
  });

  test("initialData is used without running the Effect", async () => {
    const queryFn = vi.fn(({ pageParam }: { pageParam: number }) =>
      fetchPage(pageParam)
    );
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useInfiniteQuery(
          eq.infiniteQueryOptions({
            getNextPageParam: (lastPage) => lastPage.next,
            initialData: {
              pageParams: [0],
              pages: [{ items: ["seeded"], next: null }],
            },
            initialPageParam: 0,
            queryFn,
            queryKey: ["seeded"],
            staleTime: Number.POSITIVE_INFINITY,
          })
        ),
      { wrapper }
    );

    expect(result.current.data.pages[0]?.items).toEqual(["seeded"]);
    expect(queryFn).not.toHaveBeenCalled();
  });

  test("skipToken is passed through and nothing is fetched", async () => {
    const options = eq.infiniteQueryOptions({
      getNextPageParam: () => null,
      initialPageParam: 0,
      queryFn: skipToken,
      queryKey: ["skip-pages"],
    });
    expect(options.queryFn).toBe(skipToken);

    const { wrapper } = createWrapper();
    const { result } = await renderHook(() => useInfiniteQuery(options), {
      wrapper,
    });
    expect(result.current.status).toBe("pending");
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("works with useSuspenseInfiniteQuery", async () => {
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useSuspenseInfiniteQuery(
          eq.infiniteQueryOptions({
            getNextPageParam: (lastPage) => lastPage.next,
            initialPageParam: 1,
            queryFn: ({ pageParam }: { pageParam: number }) =>
              fetchPage(pageParam),
            queryKey: ["suspense-pages"],
          })
        ),
      { wrapper }
    );

    await vi.waitFor(() =>
      expect(result.current.data.pages[0]?.items).toEqual([
        "item-1-a",
        "item-1-b",
      ])
    );
  });
});

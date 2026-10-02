import {
  infiniteQueryOptions,
  skipToken,
  useInfiniteQuery,
  useSuspenseInfiniteQuery,
} from "@tanstack/react-query";
import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import { renderHook } from "vitest-browser-react";
import { createEffectQuery } from "../src";
import { afterQueryFinish, HooksWrapper } from "./_helpers";

describe("infiniteQueryOptions", () => {
  const testContext = () => {
    const eq = createEffectQuery(Layer.empty);
    return { eq };
  };

  test("should work with defined initial data", async () => {
    const { eq } = testContext();

    // Default implementation
    const defaultOptions = infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: () => ({
        pageParams: [0],
        pages: [
          {
            data: "test",
            nextCursor: 0,
          },
        ],
      }),
      initialPageParam: 0,
      queryFn: async () => ({
        data: "test",
        nextCursor: 1,
      }),
      queryKey: ["test"],
    });

    // EffectQuery implementation
    const effectQueryOptions = eq.infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialData: () => ({
        pageParams: [0],
        pages: [
          {
            data: "test",
            nextCursor: 0,
          },
        ],
      }),
      initialPageParam: 0,
      queryFn: () =>
        // biome-ignore lint/correctness/useYield: test
        Effect.gen(function* () {
          return {
            data: "test",
            nextCursor: 1,
          };
        }),
      queryKey: ["test"],
    });

    const { result: defaultResult } = await renderHook(
      () => useInfiniteQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useInfiniteQuery(effectQueryOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    await afterQueryFinish(
      () => {
        expect(defaultResult.current.data).toEqual(
          effectQueryResult.current.data
        );
      },
      defaultResult,
      effectQueryResult
    );
  });

  test("skip token - should not load with skipToken", () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.infiniteQueryOptions({
      getNextPageParam: () => 1,
      initialPageParam: 0,
      queryFn: skipToken,
      queryKey: ["test"],
    });

    expect(effectQueryOptions.enabled).toBe(false);
  });

  test("skip token - should not load with skipToken", () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.infiniteQueryOptions({
      getNextPageParam: () => 1,
      initialPageParam: 0,
      queryFn: () => Effect.succeed("test"),
      queryKey: ["test"],
    });

    expect(effectQueryOptions.enabled).toBe(true);
  });

  test("should work with unused skip token", async () => {
    const { eq } = testContext();
    const shouldSkip = Math.random() < 0.5;
    // Default implementation
    const defaultOptions = infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: shouldSkip
        ? skipToken
        : ({ pageParam }: { pageParam: number }) => ({
            data: "test",
            nextCursor: pageParam + 1,
          }),
      queryKey: ["test"],
    });
    const effectQueryOptions = eq.infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: shouldSkip
        ? skipToken
        : ({ pageParam }: { pageParam: number }) =>
            // biome-ignore lint/correctness/useYield: test
            Effect.gen(function* () {
              return {
                data: "test",
                nextCursor: pageParam + 1,
              };
            }),
      queryKey: ["test"],
    });

    const { result: defaultResult } = await renderHook(
      () => useInfiniteQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useInfiniteQuery(effectQueryOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    await afterQueryFinish(
      () => {
        expect(defaultResult.current.data).toEqual(
          effectQueryResult.current.data
        );
      },
      defaultResult,
      effectQueryResult
    );
  });

  test("should work with undefined initial data", async () => {
    const { eq } = testContext();
    // Default implementation
    const defaultOptions = infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: ({ pageParam }: { pageParam: number }) => ({
        data: "test",
        nextCursor: pageParam + 1,
      }),
      queryKey: ["test"],
    });

    // EffectQuery implementation
    const effectQueryOptions = eq.infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        Effect.succeed({
          data: "test",
          nextCursor: pageParam + 1,
        }),
      queryKey: ["test"],
    });

    const { result: defaultResult } = await renderHook(
      () => useInfiniteQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useInfiniteQuery(effectQueryOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    await afterQueryFinish(
      () => {
        expect(defaultResult.current.data).toEqual(
          effectQueryResult.current.data
        );
      },
      defaultResult,
      effectQueryResult
    );
  });

  test("should work with suspenseQuery", async () => {
    const { eq } = testContext();
    const defaultOptions = infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: ({ pageParam }: { pageParam: number }) => ({
        data: "test",
        nextCursor: pageParam + 1,
      }),
      queryKey: ["test"],
    });
    const effectQueryOptions = eq.infiniteQueryOptions({
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        Effect.succeed({
          data: "test",
          nextCursor: pageParam + 1,
        }),
      queryKey: ["test"],
    });
    const { result: defaultResult } = await renderHook(
      () => useSuspenseInfiniteQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useSuspenseInfiniteQuery(effectQueryOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    await afterQueryFinish(
      () => {
        expect(defaultResult.current.data).toEqual(
          effectQueryResult.current.data
        );
      },
      defaultResult,
      effectQueryResult
    );
  });
});

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
      queryKey: ["test"],
      initialData: () => ({
        pages: [
          {
            nextCursor: 0,
            data: "test",
          },
        ],
        pageParams: [0],
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: async () => ({
        nextCursor: 1,
        data: "test",
      }),
    });

    // EffectQuery implementation
    const effectQueryOptions = eq.infiniteQueryOptions({
      queryKey: ["test"],
      initialData: () => ({
        pages: [
          {
            nextCursor: 0,
            data: "test",
          },
        ],
        pageParams: [0],
      }),
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      initialPageParam: 0,
      queryFn: () =>
        // biome-ignore lint/correctness/useYield: test
        Effect.gen(function* () {
          return {
            nextCursor: 1,
            data: "test",
          };
        }),
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
      queryKey: ["test"],
      queryFn: skipToken,
      getNextPageParam: () => 1,
      initialPageParam: 0,
    });

    expect(effectQueryOptions.enabled).toBe(false);
  });

  test("skip token - should not load with skipToken", () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.infiniteQueryOptions({
      queryKey: ["test"],
      queryFn: () => Effect.succeed("test"),
      getNextPageParam: () => 1,
      initialPageParam: 0,
    });

    expect(effectQueryOptions.enabled).toBe(true);
  });

  test("should work with unused skip token", async () => {
    const { eq } = testContext();
    // biome-ignore lint/style/noMagicNumbers:test
    const shouldSkip = Math.random() < 0.5;
    // Default implementation
    const defaultOptions = infiniteQueryOptions({
      queryKey: ["test"],
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      queryFn: shouldSkip
        ? skipToken
        : ({ pageParam }: { pageParam: number }) => ({
            nextCursor: pageParam + 1,
            data: "test",
          }),
    });
    const effectQueryOptions = eq.infiniteQueryOptions({
      queryKey: ["test"],
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      queryFn: shouldSkip
        ? skipToken
        : ({ pageParam }: { pageParam: number }) =>
            // biome-ignore lint/correctness/useYield: test
            Effect.gen(function* () {
              return {
                nextCursor: pageParam + 1,
                data: "test",
              };
            }),
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
      queryKey: ["test"],
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      queryFn: ({ pageParam }: { pageParam: number }) => ({
        nextCursor: pageParam + 1,
        data: "test",
      }),
    });

    // EffectQuery implementation
    const effectQueryOptions = eq.infiniteQueryOptions({
      queryKey: ["test"],
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        Effect.succeed({
          nextCursor: pageParam + 1,
          data: "test",
        }),
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
      queryKey: ["test"],
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      queryFn: ({ pageParam }: { pageParam: number }) => ({
        nextCursor: pageParam + 1,
        data: "test",
      }),
    });
    const effectQueryOptions = eq.infiniteQueryOptions({
      queryKey: ["test"],
      initialPageParam: 0,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      queryFn: ({ pageParam }: { pageParam: number }) =>
        Effect.succeed({
          nextCursor: pageParam + 1,
          data: "test",
        }),
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

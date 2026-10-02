import {
  queryOptions,
  skipToken,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import { renderHook } from "vitest-browser-react";
import { createEffectQuery } from "../../src";
import { afterQueryFinish, HooksWrapper } from "./_helpers";

describe("queryOptions", () => {
  const testContext = () => {
    const eq = createEffectQuery(Layer.empty);
    return { eq };
  };

  test("should work with defined initial data", async () => {
    const { eq } = testContext();
    const defaultOptions = queryOptions({
      initialData: () => "test",
      queryFn: () => "test",
      queryKey: ["test"],
    });
    const effectQueryOptions = eq.queryOptions({
      initialData: () => "test",
      queryFn: () => Effect.succeed("test"),
      queryKey: ["test"],
    });
    const { result: defaultResult } = await renderHook(
      () => useQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useQuery(effectQueryOptions),
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

  test("skip token - passes skipToken through and does not fetch", async () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.queryOptions({
      queryFn: skipToken,
      queryKey: ["skip-token"],
    });

    expect(effectQueryOptions.queryFn).toBe(skipToken);

    const { result } = await renderHook(() => useQuery(effectQueryOptions), {
      wrapper: HooksWrapper,
    });
    expect(result.current.status).toBe("pending");
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("skip token - wraps the effect into a promise returning queryFn", () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.queryOptions({
      queryFn: () => Effect.succeed("test"),
      queryKey: ["test"],
    });

    expect(typeof effectQueryOptions.queryFn).toBe("function");
    expect(effectQueryOptions.enabled).toBeUndefined();
  });

  test("should work with skip token", async () => {
    const { eq } = testContext();
    const enabled = Math.random() < 0.5;
    const defaultOptions = queryOptions({
      queryFn: enabled ? async () => "test" : skipToken,
      queryKey: ["test"],
    });
    const effectQueryOptions = eq.queryOptions({
      queryFn: enabled ? () => Effect.succeed("test") : skipToken,
      queryKey: ["test"],
    });
    const { result: defaultResult } = await renderHook(
      () => useQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useQuery(effectQueryOptions),
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
    const defaultOptions = queryOptions({
      queryFn: () => "test",
      queryKey: ["test"],
    });
    const effectQueryOptions = eq.queryOptions({
      queryFn: () => Effect.succeed("test"),
      queryKey: ["test"],
    });
    const { result: defaultResult } = await renderHook(
      () => useQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useQuery(effectQueryOptions),
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
    const defaultOptions = queryOptions({
      queryFn: () => "test",
      queryKey: ["test"],
    });
    const effectQueryOptions = eq.queryOptions({
      queryFn: () => Effect.succeed("test"),
      queryKey: ["test"],
    });
    const { result: defaultResult } = await renderHook(
      () => useSuspenseQuery(defaultOptions),
      {
        wrapper: HooksWrapper,
      }
    );
    const { result: effectQueryResult } = await renderHook(
      () => useSuspenseQuery(effectQueryOptions),
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

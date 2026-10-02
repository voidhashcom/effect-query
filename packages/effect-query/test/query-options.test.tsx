import {
  queryOptions,
  skipToken,
  useQuery,
  useSuspenseQuery,
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

  test("skip token - should not load with skipToken", () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.queryOptions({
      queryFn: skipToken,
      queryKey: ["test"],
    });

    expect(effectQueryOptions.enabled).toBe(false);
  });

  test("skip token - should not load with skipToken", () => {
    const { eq } = testContext();

    const effectQueryOptions = eq.queryOptions({
      queryFn: () => Effect.succeed("test"),
      queryKey: ["test"],
    });

    expect(effectQueryOptions.enabled).toBe(true);
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

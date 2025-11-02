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
import { HooksWrapper } from "./_helpers";

describe("infiniteQueryOptions", () => {
  const testContext = () => {
    const eq = createEffectQuery(Layer.empty);
    return { eq };
  };

  test("should work with defined initial data", async () => {
    const { eq } = testContext();
    const defaultOptions = queryOptions({
      queryKey: ["test"],
      initialData: () => "test",
      queryFn: () => "test",
    });
    const effectQueryOptions = eq.queryOptions({
      queryKey: ["test"],
      initialData: () => "test",
      queryFn: () => Effect.succeed("test"),
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

    expect(defaultResult.current.data).toEqual(effectQueryResult.current.data);
  });

  test("should work with skip token", async () => {
    const { eq } = testContext();
    const defaultOptions = queryOptions({
      queryKey: ["test"],
      queryFn: skipToken,
    });
    const effectQueryOptions = eq.queryOptions({
      queryKey: ["test"],
      queryFn: skipToken,
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

    expect(defaultResult.current.data).toEqual(effectQueryResult.current.data);
  });

  test("should work with undefined initial data", async () => {
    const { eq } = testContext();
    const defaultOptions = queryOptions({
      queryKey: ["test"],
      queryFn: () => "test",
    });
    const effectQueryOptions = eq.queryOptions({
      queryKey: ["test"],
      queryFn: () => Effect.succeed("test"),
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

    expect(defaultResult.current.data).toEqual(effectQueryResult.current.data);
  });

  test("should work with suspenseQuery", async () => {
    const { eq } = testContext();
    const defaultOptions = queryOptions({
      queryKey: ["test"],
      queryFn: () => "test",
    });
    const effectQueryOptions = eq.queryOptions({
      queryKey: ["test"],
      queryFn: () => Effect.succeed("test"),
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

    expect(defaultResult.current.data).toEqual(effectQueryResult.current.data);
  });
});

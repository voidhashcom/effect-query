import {
  keepPreviousData,
  skipToken,
  useQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Context, Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import {
  createEffectQuery,
  createEffectQueryFromManagedRuntime,
  EffectQueryDefect,
} from "../../src";
import { createWrapper } from "./_helpers";

class Counter extends Context.Service<
  Counter,
  { readonly next: Effect.Effect<number> }
>()("test/react/Counter") {}

const counterLayer = () => {
  let value = 0;
  return Layer.succeed(Counter)({
    next: Effect.sync(() => {
      value += 1;
      return value;
    }),
  });
};

const nextValue = Effect.gen(function* () {
  const counter = yield* Counter;
  return yield* counter.next;
});

describe("queryOptions", () => {
  test("resolves with the value produced by the Effect", async () => {
    const eq = createEffectQuery(counterLayer());
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({ queryFn: () => nextValue, queryKey: ["n"] })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(1);
  });

  test("refetching runs the Effect again", async () => {
    const eq = createEffectQuery(counterLayer());
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({ queryFn: () => nextValue, queryKey: ["n"] })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.data).toBe(1));
    await result.current.refetch();
    await vi.waitFor(() => expect(result.current.data).toBe(2));
  });

  test("initialData is used without running the Effect", async () => {
    const queryFn = vi.fn(() => Effect.succeed("fetched"));
    const eq = createEffectQuery(Layer.empty);
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            initialData: "initial",
            queryFn,
            queryKey: ["initial"],
            staleTime: Number.POSITIVE_INFINITY,
          })
        ),
      { wrapper }
    );

    expect(result.current.status).toBe("success");
    expect(result.current.data).toBe("initial");
    expect(queryFn).not.toHaveBeenCalled();
  });

  test("select transforms the value of the Effect", async () => {
    const eq = createEffectQuery(Layer.empty);
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            queryFn: () => Effect.succeed({ name: "Ripley" }),
            queryKey: ["select"],
            select: (user) => user.name.toUpperCase(),
          })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.data).toBe("RIPLEY"));
  });

  test("placeholderData keeps the previous value while the next key loads", async () => {
    const eq = createEffectQuery(Layer.empty);
    const { wrapper } = createWrapper();
    const { result, rerender } = await renderHook(
      ({ id }: { id: number } = { id: 1 }) =>
        useQuery(
          eq.queryOptions({
            placeholderData: keepPreviousData,
            queryFn: () => Effect.as(Effect.sleep("20 millis"), `user:${id}`),
            queryKey: ["placeholder", id],
          })
        ),
      { initialProps: { id: 1 }, wrapper }
    );

    await vi.waitFor(() => expect(result.current.data).toBe("user:1"));
    await rerender({ id: 2 });
    expect(result.current.data).toBe("user:1");
    expect(result.current.isPlaceholderData).toBe(true);
    await vi.waitFor(() => expect(result.current.data).toBe("user:2"));
  });

  test("skipToken is passed through and nothing is fetched", async () => {
    const eq = createEffectQuery(Layer.empty);
    const options = eq.queryOptions({ queryFn: skipToken, queryKey: ["skip"] });
    expect(options.queryFn).toBe(skipToken);

    const { wrapper } = createWrapper();
    const { result } = await renderHook(() => useQuery(options), { wrapper });
    expect(result.current.status).toBe("pending");
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("works with useSuspenseQuery", async () => {
    const eq = createEffectQuery(counterLayer());
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useSuspenseQuery(
          eq.queryOptions({ queryFn: () => nextValue, queryKey: ["suspense"] })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.data).toBe(1));
  });

  test("works with queryClient.fetchQuery and ensureQueryData", async () => {
    const eq = createEffectQuery(counterLayer());
    const { queryClient } = createWrapper();
    const options = eq.queryOptions({
      queryFn: () => nextValue,
      queryKey: ["imperative"],
    });

    await expect(queryClient.fetchQuery(options)).resolves.toBe(1);
    await expect(queryClient.ensureQueryData(options)).resolves.toBe(1);
    expect(queryClient.getQueryData(options.queryKey)).toBe(1);
  });

  test("unmounting while fetching interrupts the Effect", async () => {
    const interrupted = vi.fn();
    const eq = createEffectQuery(Layer.empty);
    const { wrapper } = createWrapper();
    const { result, unmount } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            queryFn: () =>
              Effect.never.pipe(
                Effect.onInterrupt(() => Effect.sync(interrupted))
              ),
            queryKey: ["unmount"],
          })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.fetchStatus).toBe("fetching"));
    await unmount();
    await vi.waitFor(() => expect(interrupted).toHaveBeenCalledOnce());
  });
});

describe("createEffectQueryFromManagedRuntime", () => {
  test("runs queries on the given runtime", async () => {
    const runtime = ManagedRuntime.make(counterLayer());
    const eq = createEffectQueryFromManagedRuntime(runtime);
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({ queryFn: () => nextValue, queryKey: ["mr"] })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.data).toBe(1));
    expect(eq.runtime).toBe(runtime);
    // The runtime is shared: running on it directly sees the same service instance.
    await expect(runtime.runPromise(nextValue)).resolves.toBe(2);
    await eq.dispose();
  });

  test("queries fail with a defect once the runtime is disposed", async () => {
    const eq = createEffectQueryFromManagedRuntime(
      ManagedRuntime.make(counterLayer())
    );
    await eq.dispose();
    const { wrapper } = createWrapper();
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({ queryFn: () => nextValue, queryKey: ["disposed"] })
        ),
      { wrapper }
    );

    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(EffectQueryDefect);
  });
});

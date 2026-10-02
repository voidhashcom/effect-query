import {
  QueryClient,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/solid-query";
import { Context, Data, Effect, Layer, ManagedRuntime } from "effect";
import { createRoot, createSignal } from "solid-js";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createEffectQuery,
  createEffectQueryFromManagedRuntime,
  EffectQueryDefect,
  EffectQueryFailure,
} from "../../src/solid";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}

class Greeter extends Context.Service<
  Greeter,
  { readonly greet: (name: string) => Effect.Effect<string, NotFound> }
>()("test/Greeter") {}

const GreeterLive = Layer.succeed(Greeter)({
  greet: (name) =>
    name === "missing"
      ? Effect.fail(new NotFound({ id: name }))
      : Effect.succeed(`Hello, ${name}!`),
});

const greet = (name: string) =>
  Effect.gen(function* () {
    const greeter = yield* Greeter;
    return yield* greeter.greet(name);
  });

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
});

/** Runs solid-query primitives inside a reactive root with a fresh QueryClient. */
const withRoot = <TResult>(
  fn: (client: () => QueryClient) => TResult
): { queryClient: QueryClient; result: TResult } => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const result = createRoot((dispose) => {
    disposers.push(dispose);
    return fn(() => queryClient);
  });
  return { queryClient, result };
};

describe("solid runtime", () => {
  const eq = createEffectQuery(GreeterLive);

  test("provides the layer to the query", async () => {
    const { result } = withRoot((client) =>
      useQuery(
        () =>
          eq.queryOptions({
            queryFn: () => greet("Ripley"),
            queryKey: ["greet", "Ripley"],
          }),
        client
      )
    );

    await vi.waitFor(() => expect(result.isSuccess).toBe(true));
    expect(result.data).toBe("Hello, Ripley!");
  });

  test("typed failures become EffectQueryFailure", async () => {
    const { result } = withRoot((client) =>
      useQuery(
        () =>
          eq.queryOptions({
            queryFn: () => greet("missing"),
            queryKey: ["greet", "missing"],
          }),
        client
      )
    );

    await vi.waitFor(() => expect(result.isError).toBe(true));
    expect(result.error).toBeInstanceOf(EffectQueryFailure);
    expect(
      result.error?.match({
        NotFound: (notFound) => `not found: ${notFound.id}`,
        OrElse: () => "other",
      })
    ).toBe("not found: missing");
  });

  test("defects become EffectQueryDefect", async () => {
    const { result } = withRoot((client) =>
      useQuery(
        () =>
          eq.queryOptions({
            queryFn: () => Effect.die(new Error("boom")),
            queryKey: ["defect"],
          }),
        client
      )
    );

    await vi.waitFor(() => expect(result.isError).toBe(true));
    expect(result.error).toBeInstanceOf(EffectQueryDefect);
  });

  test("skipToken is passed through and does not fetch", () => {
    const options = eq.queryOptions({ queryFn: skipToken, queryKey: ["skip"] });
    expect(options.queryFn).toBe(skipToken);

    const { result } = withRoot((client) => useQuery(() => options, client));
    expect(result.status).toBe("pending");
    expect(result.fetchStatus).toBe("idle");
  });

  test("refetches with the new key when a signal changes", async () => {
    const [name, setName] = createSignal("Ripley");
    const queryFn = vi.fn(
      ({ queryKey }: { queryKey: readonly ["greet", string] }) =>
        greet(queryKey[1])
    );
    const { result } = withRoot((client) =>
      useQuery(
        () =>
          eq.queryOptions({ queryFn, queryKey: ["greet", name()] as const }),
        client
      )
    );

    await vi.waitFor(() => expect(result.data).toBe("Hello, Ripley!"));
    setName("Dallas");
    await vi.waitFor(() => expect(result.data).toBe("Hello, Dallas!"));
    expect(queryFn.mock.calls.map(([context]) => context.queryKey)).toEqual([
      ["greet", "Ripley"],
      ["greet", "Dallas"],
    ]);
  });

  test("keeps the enabled option", async () => {
    const [enabled, setEnabled] = createSignal(false);
    const queryFn = vi.fn(() => greet("Bishop"));
    const { result } = withRoot((client) =>
      useQuery(
        () =>
          eq.queryOptions({
            enabled: enabled(),
            queryFn,
            queryKey: ["greet", "enabled"],
          }),
        client
      )
    );

    expect(result.fetchStatus).toBe("idle");
    expect(queryFn).not.toHaveBeenCalled();

    setEnabled(true);
    await vi.waitFor(() => expect(result.data).toBe("Hello, Bishop!"));
  });

  test("interrupts the effect when the query is cancelled", async () => {
    const interrupted = vi.fn();
    const queryKey = ["cancel"] as const;
    const { result, queryClient } = withRoot((client) =>
      useQuery(
        () =>
          eq.queryOptions({
            queryFn: () =>
              Effect.never.pipe(
                Effect.onInterrupt(() => Effect.sync(interrupted))
              ),
            queryKey,
          }),
        client
      )
    );

    await vi.waitFor(() => expect(result.fetchStatus).toBe("fetching"));
    await queryClient.cancelQueries({ queryKey });
    await vi.waitFor(() => expect(interrupted).toHaveBeenCalled());
  });

  test("infinite queries fetch pages through the effect", async () => {
    const { result } = withRoot((client) =>
      useInfiniteQuery(
        () =>
          eq.infiniteQueryOptions({
            getNextPageParam: (lastPage) => lastPage.next,
            initialPageParam: 0,
            queryFn: ({ pageParam }: { pageParam: number }) =>
              Effect.succeed({ next: pageParam + 1, value: pageParam }),
            queryKey: ["pages"],
          }),
        client
      )
    );

    await vi.waitFor(() => expect(result.isSuccess).toBe(true));
    await result.fetchNextPage();
    await vi.waitFor(() =>
      // biome-ignore lint/suspicious/noUnnecessaryConditions: data is undefined until the first page loads
      expect(result.data?.pages.map((page) => page.value)).toEqual([0, 1])
    );
  });

  test("mutations receive variables and the mutation context", async () => {
    const { result } = withRoot((client) =>
      useMutation(
        () =>
          eq.mutationOptions({
            mutationFn: (name: string, context) =>
              Effect.map(greet(name), (greeting) => ({
                greeting,
                key: context.mutationKey,
              })),
            mutationKey: ["greet-mutation"],
          }),
        client
      )
    );

    await expect(result.mutateAsync("Dallas")).resolves.toEqual({
      greeting: "Hello, Dallas!",
      key: ["greet-mutation"],
    });
  });

  test("typed mutation failures reach onError", async () => {
    const onError = vi.fn();
    const runtimeEq = createEffectQueryFromManagedRuntime(
      ManagedRuntime.make(GreeterLive)
    );
    const { result } = withRoot((client) =>
      useMutation(
        () =>
          runtimeEq.mutationOptions({
            mutationFn: (name: string) => greet(name),
            onError: (error) =>
              onError(
                error.match({
                  NotFound: (notFound) => notFound.id,
                  OrElse: () => "other",
                })
              ),
          }),
        client
      )
    );

    result.mutate("missing");
    await vi.waitFor(() => expect(result.isError).toBe(true));
    expect(result.error).toBeInstanceOf(EffectQueryFailure);
    expect(onError).toHaveBeenCalledWith("missing");
  });
});

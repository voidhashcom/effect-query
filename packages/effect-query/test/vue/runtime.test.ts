import {
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQuery,
} from "@tanstack/vue-query";
import { Context, Data, Effect, Layer, ManagedRuntime } from "effect";
import { describe, expect, test, vi } from "vitest";
import { computed, ref } from "vue";
import {
  createEffectQuery,
  createEffectQueryFromManagedRuntime,
  EffectQueryDefect,
  EffectQueryFailure,
} from "../../src/vue";
import { withSetup } from "./_helpers";

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

describe("vue runtime", () => {
  const eq = createEffectQuery(GreeterLive);

  test("provides the layer to the query", async () => {
    const { result } = await withSetup(() =>
      useQuery(
        eq.queryOptions({
          queryFn: () => greet("Ripley"),
          queryKey: ["greet", "Ripley"],
        })
      )
    );

    await vi.waitFor(() => expect(result.isSuccess.value).toBe(true));
    expect(result.data.value).toBe("Hello, Ripley!");
  });

  test("typed failures become EffectQueryFailure", async () => {
    const { result } = await withSetup(() =>
      useQuery(
        eq.queryOptions({
          queryFn: () => greet("missing"),
          queryKey: ["greet", "missing"],
        })
      )
    );

    await vi.waitFor(() => expect(result.isError.value).toBe(true));
    expect(result.error.value).toBeInstanceOf(EffectQueryFailure);
    expect(
      result.error.value?.match({
        NotFound: (notFound) => `not found: ${notFound.id}`,
        OrElse: () => "other",
      })
    ).toBe("not found: missing");
  });

  test("defects become EffectQueryDefect", async () => {
    const { result } = await withSetup(() =>
      useQuery(
        eq.queryOptions({
          queryFn: () => Effect.die(new Error("boom")),
          queryKey: ["defect"],
        })
      )
    );

    await vi.waitFor(() => expect(result.isError.value).toBe(true));
    expect(result.error.value).toBeInstanceOf(EffectQueryDefect);
  });

  test("skipToken is passed through and does not fetch", async () => {
    const options = eq.queryOptions({
      queryFn: skipToken,
      queryKey: ["skip"],
    });
    expect(options.queryFn).toBe(skipToken);

    const { result } = await withSetup(() => useQuery(options));
    expect(result.status.value).toBe("pending");
    expect(result.fetchStatus.value).toBe("idle");
  });

  test("refs in the queryKey are unwrapped and tracked", async () => {
    const name = ref("Ripley");
    const queryFn = vi.fn(
      ({ queryKey }: { queryKey: readonly ["greet", string] }) =>
        greet(queryKey[1])
    );
    // Passing options with refs straight to `useQuery` only typechecks on TypeScript 7
    // (the same applies to vue-query's own `queryOptions`), see the README.
    const options = eq.queryOptions({
      queryFn,
      queryKey: ["greet", name] as const,
    }) as unknown as Parameters<typeof useQuery<string>>[0];
    const { result } = await withSetup(() => useQuery(options));

    await vi.waitFor(() => expect(result.data.value).toBe("Hello, Ripley!"));
    name.value = "Dallas";
    await vi.waitFor(() => expect(result.data.value).toBe("Hello, Dallas!"));
    expect(queryFn.mock.calls.map(([context]) => context.queryKey)).toEqual([
      ["greet", "Ripley"],
      ["greet", "Dallas"],
    ]);
  });

  test("works with a getter for reactive options", async () => {
    const name = ref("Ripley");
    const { result } = await withSetup(() =>
      useQuery(() =>
        eq.queryOptions({
          queryFn: () => greet(name.value),
          queryKey: ["greet", "getter", name.value],
        })
      )
    );

    await vi.waitFor(() => expect(result.data.value).toBe("Hello, Ripley!"));
    name.value = "Hicks";
    await vi.waitFor(() => expect(result.data.value).toBe("Hello, Hicks!"));
  });

  test("keeps a reactive enabled option", async () => {
    const enabled = ref(false);
    const queryFn = vi.fn(() => greet("Bishop"));
    const { result } = await withSetup(() =>
      useQuery(
        eq.queryOptions({
          enabled: computed(() => enabled.value),
          queryFn,
          queryKey: ["greet", "enabled"],
        })
      )
    );

    expect(result.fetchStatus.value).toBe("idle");
    expect(queryFn).not.toHaveBeenCalled();

    enabled.value = true;
    await vi.waitFor(() => expect(result.data.value).toBe("Hello, Bishop!"));
  });

  test("interrupts the effect when the query is cancelled", async () => {
    const interrupted = vi.fn();
    const queryKey = ["cancel"] as const;
    const { result, queryClient } = await withSetup(() =>
      useQuery(
        eq.queryOptions({
          queryFn: () =>
            Effect.never.pipe(
              Effect.onInterrupt(() => Effect.sync(interrupted))
            ),
          queryKey,
        })
      )
    );

    await vi.waitFor(() => expect(result.fetchStatus.value).toBe("fetching"));
    await queryClient.cancelQueries({ queryKey });
    await vi.waitFor(() => expect(interrupted).toHaveBeenCalled());
  });

  test("infinite queries fetch pages through the effect", async () => {
    const { result } = await withSetup(() =>
      useInfiniteQuery(
        eq.infiniteQueryOptions({
          getNextPageParam: (lastPage) => lastPage.next,
          initialPageParam: 0,
          queryFn: ({ pageParam }: { pageParam: number }) =>
            Effect.succeed({ next: pageParam + 1, value: pageParam }),
          queryKey: ["pages"],
        })
      )
    );

    await vi.waitFor(() => expect(result.isSuccess.value).toBe(true));
    await result.fetchNextPage();
    await vi.waitFor(() =>
      expect(result.data.value?.pages.map((page) => page.value)).toEqual([0, 1])
    );
  });

  test("mutations receive variables and the mutation context", async () => {
    const { result } = await withSetup(() =>
      useMutation(
        eq.mutationOptions({
          mutationFn: (name: string, context) =>
            Effect.map(greet(name), (greeting) => ({
              greeting,
              key: context.mutationKey,
            })),
          mutationKey: ["greet-mutation"],
        })
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
    const { result } = await withSetup(() =>
      useMutation(
        runtimeEq.mutationOptions({
          mutationFn: (name: string) => greet(name),
          onError: (error) =>
            onError(
              error.match({
                NotFound: (notFound) => notFound.id,
                OrElse: () => "other",
              })
            ),
        })
      )
    );

    result.mutate("missing");
    await vi.waitFor(() => expect(result.isError.value).toBe(true));
    expect(result.error.value).toBeInstanceOf(EffectQueryFailure);
    expect(onError).toHaveBeenCalledWith("missing");
  });
});

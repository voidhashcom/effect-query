import { useMutation, useQuery } from "@tanstack/react-query";
import { Context, Data, Effect, Layer } from "effect";
import { describe, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import {
  createEffectQuery,
  EffectQueryDefect,
  EffectQueryFailure,
} from "../../src";
import { HooksWrapper, queryClient } from "./_helpers";

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

describe("runtime", () => {
  const eq = createEffectQuery(GreeterLive);

  test("provides the layer to the query", async () => {
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            queryFn: () => greet("Ripley"),
            queryKey: ["greet", "Ripley"],
          })
        ),
      { wrapper: HooksWrapper }
    );

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("Hello, Ripley!");
  });

  test("typed failures become EffectQueryFailure", async () => {
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            queryFn: () => greet("missing"),
            queryKey: ["greet", "missing"],
            retry: false,
          })
        ),
      { wrapper: HooksWrapper }
    );

    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    const { error } = result.current;
    expect(error).toBeInstanceOf(EffectQueryFailure);
    expect(
      error?.match({
        NotFound: (notFound) => `not found: ${notFound.id}`,
        OrElse: () => "other",
      })
    ).toBe("not found: missing");
  });

  test("defects become EffectQueryDefect", async () => {
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            queryFn: () => Effect.die(new Error("boom")),
            queryKey: ["defect"],
            retry: false,
          })
        ),
      { wrapper: HooksWrapper }
    );

    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(EffectQueryDefect);
    expect(result.current.error?.match({ OrElse: () => "defect" })).toBe(
      "defect"
    );
  });

  test("keeps an enabled callback", async () => {
    const queryFn = vi.fn(() => Effect.succeed("never"));
    const enabled = vi.fn(() => false);
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({ enabled, queryFn, queryKey: ["enabled-callback"] })
        ),
      { wrapper: HooksWrapper }
    );

    expect(enabled).toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe("idle");
    expect(queryFn).not.toHaveBeenCalled();
  });

  test("passes the query function context to the effect", async () => {
    const queryFn = vi.fn(
      ({ queryKey }: { queryKey: readonly unknown[]; signal: AbortSignal }) =>
        Effect.succeed(queryKey.join("/"))
    );
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({ queryFn, queryKey: ["context", 1] as const })
        ),
      { wrapper: HooksWrapper }
    );

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe("context/1");
    expect(queryFn.mock.calls[0]?.[0].signal).toBeInstanceOf(AbortSignal);
  });

  test("interrupts the effect when the query is cancelled", async () => {
    const interrupted = vi.fn();
    const queryKey = ["cancel"] as const;
    const { result } = await renderHook(
      () =>
        useQuery(
          eq.queryOptions({
            queryFn: () =>
              Effect.never.pipe(
                Effect.onInterrupt(() => Effect.sync(interrupted))
              ),
            queryKey,
          })
        ),
      { wrapper: HooksWrapper }
    );

    await vi.waitFor(() => expect(result.current.fetchStatus).toBe("fetching"));
    await queryClient.cancelQueries({ queryKey });
    await vi.waitFor(() => expect(interrupted).toHaveBeenCalled());
  });

  test("passes variables and the mutation context to the effect", async () => {
    const mutationFn = vi.fn(
      (name: string, context: { mutationKey?: readonly unknown[] }) =>
        Effect.map(greet(name), (greeting) => ({
          greeting,
          key: context.mutationKey,
        }))
    );
    const { result } = await renderHook(
      () =>
        useMutation(
          eq.mutationOptions({ mutationFn, mutationKey: ["greet-mutation"] })
        ),
      { wrapper: HooksWrapper }
    );

    result.current.mutate("Dallas");
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({
      greeting: "Hello, Dallas!",
      key: ["greet-mutation"],
    });
  });

  test("typed mutation failures reach onError", async () => {
    const onError = vi.fn();
    const { result } = await renderHook(
      () =>
        useMutation(
          eq.mutationOptions({
            mutationFn: (name: string) => greet(name),
            onError: (error) =>
              onError(
                error.match({
                  NotFound: (notFound) => notFound.id,
                  OrElse: () => "other",
                })
              ),
          })
        ),
      { wrapper: HooksWrapper }
    );

    result.current.mutate("missing");
    await vi.waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(EffectQueryFailure);
    expect(onError).toHaveBeenCalledWith("missing");
  });
});

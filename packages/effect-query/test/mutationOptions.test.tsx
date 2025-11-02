import { mutationOptions, useMutation } from "@tanstack/react-query";
import { Cause, Data, Effect, Layer } from "effect";
import { describe, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { createEffectQuery } from "../src";
import { EffectQueryDefect, EffectQueryFailure } from "../src/errors";
import { HooksWrapper } from "./_helpers";

describe("mutationOptions", () => {
  const testContext = () => {
    const eq = createEffectQuery(Layer.empty);
    return { eq };
  };

  test("should work with successful mutation", async () => {
    const { eq } = testContext();
    mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: async () => "success",
    });
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: () => Effect.succeed("success"),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.data).toBe("success");
    expect(result.current.error).toBeNull();
  });

  test("should work with mutation variables", async () => {
    const { eq } = testContext();
    mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: async (variables: { id: string; name: string }) =>
        `Updated ${variables.name} (${variables.id})`,
    });

    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: (variables: { id: string; name: string }) =>
        Effect.succeed(`Updated ${variables.name} (${variables.id})`),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate({ id: "123", name: "John" });

    await vi.waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.data).toBe("Updated John (123)");
  });

  test("should handle EffectQueryFailure errors", async () => {
    class TestError extends Data.TaggedError("TestError")<{
      message: string;
    }> {}

    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: () => Effect.fail(new TestError({ message: "Test failed" })),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeInstanceOf(EffectQueryFailure);
    if (result.current.error instanceof EffectQueryFailure) {
      expect(result.current.error.failure).toBeInstanceOf(TestError);
      expect(result.current.error.failure.message).toBe("Test failed");
    }
  });

  test("should handle EffectQueryDefect errors", async () => {
    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: () => Effect.die("Something went wrong"),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.error).toBeInstanceOf(EffectQueryDefect);
  });

  test("should work with error matching", async () => {
    class TestError extends Data.TaggedError("TestError")<{
      message: string;
    }> {}

    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: () => Effect.fail(new TestError({ message: "Test failed" })),
    });

    let matchedError: string | null = null;

    const { result } = await renderHook(
      () =>
        useMutation({
          ...effectMutationOptions,
          onError: (error) => {
            matchedError = error.match({
              TestError: (err) => err.message,
              OrElse: () => "Unknown error",
            });
          },
        }),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    await vi.waitFor(
      () => {
        expect(matchedError).toBe("Test failed");
      },
      { timeout: 5000 }
    );
  });

  test("should use default span name when mutationKey is not provided", async () => {
    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationFn: () => Effect.succeed("success"),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.data).toBe("success");
  });

  test("should work with mutationKey as string", async () => {
    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["custom-mutation"],
      mutationFn: () => Effect.succeed("success"),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 }
    );

    expect(result.current.data).toBe("success");
  });

  test("should work with async Effect operations", async () => {
    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: (variables: { delay: number }) =>
        Effect.gen(function* () {
          yield* Effect.sleep(`${variables.delay} millis`);
          return `Delayed by ${variables.delay}ms`;
        }),
    });

    const { result } = await renderHook(
      () => useMutation(effectMutationOptions),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate({ delay: 100 });

    await vi.waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 2000 }
    );

    expect(result.current.data).toBe("Delayed by 100ms");
  });

  test("should work with OrElse error handler", async () => {
    const { eq } = testContext();
    const effectMutationOptions = eq.mutationOptions({
      mutationKey: ["test-mutation"],
      mutationFn: () => Effect.die("Unexpected defect"),
    });

    let handledError: string | null = null;

    const { result } = await renderHook(
      () =>
        useMutation({
          ...effectMutationOptions,
          onError: (error) => {
            handledError = error.match({
              OrElse: (cause) => Cause.pretty(cause),
            });
          },
        }),
      {
        wrapper: HooksWrapper,
      }
    );

    result.current.mutate(undefined);

    await vi.waitFor(
      () => {
        expect(result.current.isError).toBe(true);
      },
      { timeout: 5000 }
    );

    await vi.waitFor(
      () => {
        expect(handledError).toBeTruthy();
      },
      { timeout: 5000 }
    );
  });
});

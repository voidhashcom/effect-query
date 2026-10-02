import {
  Cause,
  Context,
  Data,
  Effect,
  Layer,
  Logger,
  ManagedRuntime,
} from "effect";
import { describe, expect, test, vi } from "vitest";
import { EffectQueryDefect, EffectQueryFailure } from "../../src/core/errors";
import {
  makeOptionFactories,
  runnerFromLayer,
  runnerFromManagedRuntime,
} from "../../src/core/options";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}

class Db extends Context.Service<
  Db,
  { readonly get: (id: string) => Effect.Effect<string, NotFound> }
>()("test/core/Db") {}

const dbImpl: Db["Service"] = {
  get: (id) =>
    id === "missing"
      ? Effect.fail(new NotFound({ id }))
      : Effect.succeed(`row:${id}`),
};

const getRow = (id: string) =>
  Effect.gen(function* () {
    const db = yield* Db;
    return yield* db.get(id);
  });

type QueryFn = (context: {
  queryKey: readonly unknown[];
  signal: AbortSignal;
}) => Promise<unknown>;
type MutationFn = (
  variables: unknown,
  context?: { mutationKey?: readonly unknown[] }
) => Promise<unknown>;

const runQuery = (
  options: { queryFn?: unknown; queryKey?: readonly unknown[] },
  signal = new AbortController().signal
) =>
  (options.queryFn as QueryFn)({
    queryKey: options.queryKey ?? ["test"],
    signal,
  });

/** A Db layer that counts how often it is built and can be made to die while building. */
const countedDb = (dieOnBuild: (build: number) => boolean = () => false) => {
  const counter = { builds: 0, releases: 0 };
  const layer = Layer.effect(Db)(
    Effect.acquireRelease(
      Effect.suspend(() => {
        counter.builds += 1;
        return dieOnBuild(counter.builds)
          ? Effect.die(new Error(`build ${counter.builds} failed`))
          : Effect.succeed(dbImpl);
      }),
      () =>
        Effect.sync(() => {
          counter.releases += 1;
        })
    )
  );
  return { counter, layer };
};

describe("query functions", () => {
  const eq = makeOptionFactories(runnerFromLayer(Layer.succeed(Db)(dbImpl)));

  test("resolves with the value of the Effect", async () => {
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row", "1"],
    });
    await expect(runQuery(options)).resolves.toBe("row:1");
  });

  test("rejects with an EffectQueryFailure for a typed failure", async () => {
    const options = eq.queryOptions({
      queryFn: () => getRow("missing"),
      queryKey: ["row", "missing"],
    });
    const error = await runQuery(options).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EffectQueryFailure);
    expect((error as EffectQueryFailure<NotFound>).failure.id).toBe("missing");
  });

  test("a function that throws instead of returning an Effect rejects with a defect", async () => {
    const thrown = new Error("sync throw");
    const options = eq.queryOptions({
      queryFn: () => {
        throw thrown;
      },
      queryKey: ["throws"],
    });
    const error = await runQuery(options).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EffectQueryDefect);
    expect((error as EffectQueryDefect).defect).toBe(thrown);
  });

  test("a mutation function that throws rejects with a defect", async () => {
    const thrown = new Error("sync throw");
    const options = eq.mutationOptions({
      mutationFn: (_: string) => {
        throw thrown;
      },
    });
    const error = await (options.mutationFn as MutationFn)("x").catch(
      (e: unknown) => e
    );
    expect(error).toBeInstanceOf(EffectQueryDefect);
    expect((error as EffectQueryDefect).defect).toBe(thrown);
  });

  test("aborting the signal interrupts the Effect and runs its finalizers", async () => {
    const finalized = vi.fn();
    const controller = new AbortController();
    const options = eq.queryOptions({
      queryFn: () => Effect.never.pipe(Effect.ensuring(Effect.sync(finalized))),
      queryKey: ["never"],
    });
    const pending = runQuery(options, controller.signal).catch(
      (e: unknown) => e
    );
    controller.abort();
    const error = await pending;

    expect(finalized).toHaveBeenCalledOnce();
    expect(error).toBeInstanceOf(EffectQueryDefect);
    expect((error as EffectQueryDefect).interrupted).toBe(true);
  });

  test("names the span after the head of the query key", async () => {
    const spanName = () => Effect.map(Effect.currentSpan, (span) => span.name);
    await expect(
      runQuery(eq.queryOptions({ queryFn: spanName, queryKey: ["users", 1] }))
    ).resolves.toBe("users");
    await expect(
      runQuery(eq.queryOptions({ queryFn: spanName, queryKey: [1, "users"] }))
    ).resolves.toBe("effect-query");
  });

  test("names the mutation span after the mutation key", async () => {
    const options = eq.mutationOptions({
      mutationFn: (_: string) =>
        Effect.map(Effect.currentSpan, (span) => span.name),
    });
    const mutationFn = options.mutationFn as unknown as MutationFn;
    await expect(
      mutationFn("x", { mutationKey: ["rename-user"] })
    ).resolves.toBe("rename-user");
    await expect(mutationFn("x")).resolves.toBe("effect-query-mutation");
  });

  test("passes a non function queryFn and mutationFn through", () => {
    const skip = Symbol("skip");
    expect(eq.queryOptions({ queryFn: skip }).queryFn).toBe(skip);
    expect(eq.mutationOptions({ mutationFn: undefined }).mutationFn).toBe(
      undefined
    );
  });
});

describe("options objects", () => {
  const eq = makeOptionFactories(runnerFromLayer(Layer.empty));

  test("keeps every other option untouched", () => {
    const select = (value: string) => value.length;
    const options = eq.queryOptions({
      queryFn: () => Effect.succeed("value"),
      queryKey: ["untouched"],
      retry: 3,
      select,
      staleTime: 1000,
    });
    expect(options).toMatchObject({
      queryKey: ["untouched"],
      retry: 3,
      select,
      staleTime: 1000,
    });
  });

  test("keeps getters live instead of reading them once", () => {
    let id: string | undefined;
    const options = eq.queryOptions({
      get enabled() {
        return id !== undefined;
      },
      queryFn: () => Effect.succeed(id),
      get queryKey() {
        return ["user", id] as const;
      },
    });

    expect(options.enabled).toBe(false);
    expect(options.queryKey).toEqual(["user", undefined]);
    id = "1";
    expect(options.enabled).toBe(true);
    expect(options.queryKey).toEqual(["user", "1"]);
  });

  test("wraps a queryFn getter on access and keeps the wrapper stable", async () => {
    const skip = Symbol("skip");
    let id: string | undefined;
    const fetchUser = () => Effect.succeed(`user:${id}`);
    const options = eq.queryOptions({
      get queryFn() {
        return id === undefined ? skip : fetchUser;
      },
      queryKey: ["user"],
    });

    expect(options.queryFn).toBe(skip);
    id = "1";
    const wrapped = options.queryFn;
    expect(typeof wrapped).toBe("function");
    expect(options.queryFn).toBe(wrapped);
    await expect(runQuery(options)).resolves.toBe("user:1");
  });

  test("does not mutate the options it is given", () => {
    const queryFn = () => Effect.succeed(1);
    const input = { queryFn, queryKey: ["immutable"] };
    eq.queryOptions(input);
    expect(input.queryFn).toBe(queryFn);
  });
});

describe("runtime lifecycle", () => {
  test("builds the layer once for concurrent queries", async () => {
    const { counter, layer } = countedDb();
    const eq = makeOptionFactories(runnerFromLayer(layer));
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row"],
    });

    await Promise.all([
      runQuery(options),
      runQuery(options),
      runQuery(options),
    ]);
    await runQuery(options);
    expect(counter.builds).toBe(1);
  });

  test("rebuilds the layer after building it died, so retries can recover", async () => {
    const { counter, layer } = countedDb((build) => build === 1);
    const eq = makeOptionFactories(runnerFromLayer(layer));
    const firstRuntime = eq.runtime;
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row"],
    });

    const error = await runQuery(options).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EffectQueryDefect);
    expect(((error as EffectQueryDefect).defect as Error).message).toBe(
      "build 1 failed"
    );

    await expect(runQuery(options)).resolves.toBe("row:1");
    expect(counter.builds).toBe(2);
    expect(eq.runtime).not.toBe(firstRuntime);
  });

  test("concurrent queries sharing a dying build only rebuild once", async () => {
    const { counter, layer } = countedDb((build) => build === 1);
    const eq = makeOptionFactories(runnerFromLayer(layer));
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row"],
    });

    const results = await Promise.allSettled([
      runQuery(options),
      runQuery(options),
    ]);
    expect(results.map((result) => result.status)).toEqual([
      "rejected",
      "rejected",
    ]);
    await expect(runQuery(options)).resolves.toBe("row:1");
    expect(counter.builds).toBe(2);
  });

  test("cancelling a query while the layer builds does not discard the build", async () => {
    let builds = 0;
    const slowLayer = Layer.effect(Db)(
      Effect.suspend(() => {
        builds += 1;
        return Effect.as(Effect.sleep("30 millis"), dbImpl);
      })
    );
    const eq = makeOptionFactories(runnerFromLayer(slowLayer));
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row"],
    });

    const controller = new AbortController();
    const cancelled = runQuery(options, controller.signal).catch(
      (e: unknown) => e
    );
    const other = runQuery(options);
    controller.abort();

    expect(await cancelled).toBeInstanceOf(EffectQueryDefect);
    await expect(other).resolves.toBe("row:1");
    expect(builds).toBe(1);
  });

  test("never replaces a runtime passed in by the user", async () => {
    let builds = 0;
    const runtime = ManagedRuntime.make(
      Layer.effect(Db)(
        Effect.suspend(() => {
          builds += 1;
          return Effect.die(new Error("down"));
        })
      )
    );
    const eq = makeOptionFactories(runnerFromManagedRuntime(runtime));
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row"],
    });

    await expect(runQuery(options)).rejects.toBeInstanceOf(EffectQueryDefect);
    await expect(runQuery(options)).rejects.toBeInstanceOf(EffectQueryDefect);
    expect(eq.runtime).toBe(runtime);
    expect(builds).toBe(1);
  });

  test("exposes the runtime to run Effects outside of queries", async () => {
    const eq = makeOptionFactories(runnerFromLayer(Layer.succeed(Db)(dbImpl)));
    await expect(
      eq.runtime.runPromise(getRow("2") as Effect.Effect<string, NotFound>)
    ).resolves.toBe("row:2");
  });

  test("dispose runs the finalizers of the layer and stops later queries", async () => {
    const { counter, layer } = countedDb();
    const eq = makeOptionFactories(runnerFromLayer(layer));
    const options = eq.queryOptions({
      queryFn: () => getRow("1"),
      queryKey: ["row"],
    });

    await runQuery(options);
    await eq.dispose();
    expect(counter.releases).toBe(1);

    await expect(runQuery(options)).rejects.toBeInstanceOf(EffectQueryDefect);
    await expect(runQuery(options)).rejects.toBeInstanceOf(EffectQueryDefect);
    expect(counter.builds).toBe(1);
  });
});

describe("logging", () => {
  const withLogs = () => {
    const logs: { level: string; message: unknown }[] = [];
    const logger = Logger.make(({ logLevel, message }) => {
      logs.push({ level: logLevel, message });
    });
    const eq = makeOptionFactories(
      runnerFromLayer(
        Layer.merge(Layer.succeed(Db)(dbImpl), Logger.layer([logger]))
      )
    );
    return { eq, logs };
  };

  test("does not log typed failures, they are handled through TanStack Query", async () => {
    const { eq, logs } = withLogs();
    await runQuery(
      eq.queryOptions({
        queryFn: () => Effect.fail(new NotFound({ id: "1" })),
        queryKey: ["fail"],
      })
    ).catch(() => undefined);
    expect(logs).toEqual([]);
  });

  test("does not log interruptions", async () => {
    const { eq, logs } = withLogs();
    const controller = new AbortController();
    const pending = runQuery(
      eq.queryOptions({ queryFn: () => Effect.never, queryKey: ["never"] }),
      controller.signal
    ).catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    await pending;
    expect(logs).toEqual([]);
  });

  test("logs defects at the error level", async () => {
    const { eq, logs } = withLogs();
    const boom = new Error("boom");
    await runQuery(
      eq.queryOptions({ queryFn: () => Effect.die(boom), queryKey: ["die"] })
    ).catch(() => undefined);
    expect(logs).toHaveLength(1);
    expect(logs[0]?.level).toBe("Error");
    expect(logs[0]?.message).toEqual(["effect-query: unexpected defect", boom]);
  });
});

test("Cause helpers used by the runner behave as expected", () => {
  // Guards the assumptions of `discardFailedRuntime` against changes in Effect.
  expect(Cause.hasInterruptsOnly(Cause.interrupt(1))).toBe(true);
  expect(Cause.hasInterruptsOnly(Cause.die("x"))).toBe(false);
});

import { Context, Effect, Layer, ManagedRuntime } from "effect";
import { describe, expectTypeOf, test } from "vitest";
import {
  createEffectQuery,
  createEffectQueryFromManagedRuntime,
  type EffectQueryDefect,
  type EffectQueryFailure,
} from "../../src/solid";

class Db extends Context.Service<Db, { readonly get: Effect.Effect<string> }>()(
  "test/types/RuntimeHandleDb"
) {}
class Missing extends Context.Service<Missing, { readonly value: string }>()(
  "test/types/RuntimeHandleMissing"
) {}

const DbLive = Layer.succeed(Db)({ get: Effect.succeed("row") });

const readDb = () =>
  Effect.gen(function* () {
    const db = yield* Db;
    return yield* db.get;
  });

const readMissing = () =>
  Effect.gen(function* () {
    const missing = yield* Missing;
    return missing.value;
  });

describe("runtime handle", () => {
  test("createEffectQuery exposes the runtime built from its layer", () => {
    const eq = createEffectQuery(DbLive);
    expectTypeOf(eq.runtime).toEqualTypeOf<
      ManagedRuntime.ManagedRuntime<Db, never>
    >();
    expectTypeOf(eq.dispose).toEqualTypeOf<() => Promise<void>>();
  });

  test("createEffectQueryFromManagedRuntime exposes the given runtime", () => {
    const eq = createEffectQueryFromManagedRuntime(ManagedRuntime.make(DbLive));
    expectTypeOf(eq.runtime).toEqualTypeOf<
      ManagedRuntime.ManagedRuntime<Db, never>
    >();
    expectTypeOf(eq.dispose).toEqualTypeOf<() => Promise<void>>();
  });
});

describe("createEffectQueryFromManagedRuntime", () => {
  const eq = createEffectQueryFromManagedRuntime(ManagedRuntime.make(DbLive));

  test("provides the services of the runtime to queries and mutations", () => {
    eq.queryOptions({ queryFn: readDb, queryKey: ["db"] });
    eq.mutationOptions({ mutationFn: (_: string) => readDb() });
  });

  test("rejects requirements the runtime does not provide", () => {
    // @ts-expect-error Missing is not provided by the runtime
    eq.queryOptions({ queryFn: readMissing, queryKey: ["missing"] });
    // @ts-expect-error Missing is not provided by the runtime
    eq.mutationOptions({ mutationFn: (_: string) => readMissing() });
  });

  test("infers the error type of an infallible Effect as a defect only", () => {
    const options = eq.mutationOptions({ mutationFn: (_: string) => readDb() });
    type MutationError = Parameters<NonNullable<typeof options.onError>>[0];
    expectTypeOf<MutationError>().toEqualTypeOf<EffectQueryDefect<unknown>>();
    expectTypeOf<MutationError>().not.toExtend<EffectQueryFailure<never>>();
  });
});

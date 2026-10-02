import { Cause, Effect, Exit, type ManagedRuntime, Option } from "effect";
import type { Layer } from "effect/Layer";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import { EffectQueryRunner } from "./runner";

const DEFAULT_QUERY_SPAN = "effect-query";
const DEFAULT_MUTATION_SPAN = "effect-query-mutation";

// Framework agnostic, structural views of the TanStack Query option objects. Each adapter
// (react, vue, solid, svelte) exposes the precise, framework specific types on top of these.
type AnyEffectFn = (
  ...args: never[]
) => Effect.Effect<unknown, unknown, unknown>;

interface QueryFunctionContextLike {
  readonly queryKey: readonly unknown[];
  readonly signal: AbortSignal;
}

interface MutationFunctionContextLike {
  readonly mutationKey?: readonly unknown[] | undefined;
}

interface QueryOptionsLike {
  readonly queryFn?: unknown;
}

interface MutationOptionsLike {
  readonly mutationFn?: unknown;
}

const spanNameFromKey = (
  key: readonly unknown[] | undefined,
  fallback: string
): string => {
  const head = key?.[0];
  return typeof head === "string" ? head : fallback;
};

/** Converts the `Cause` of a failed Effect into the error thrown to TanStack Query. */
export const toEffectQueryError = <E>(
  cause: Cause.Cause<E>
): EffectQueryFailure<never> | EffectQueryDefect<unknown> => {
  const failure = Cause.findErrorOption(cause);
  if (Option.isSome(failure)) {
    return EffectQueryFailure.fromCause(
      failure.value as never,
      cause as Cause.Cause<never>
    ) as EffectQueryFailure<never>;
  }
  return EffectQueryDefect.fromCause(cause as Cause.Cause<unknown>);
};

const runToPromise = async <A, E, R>(
  runner: EffectQueryRunner,
  effect: Effect.Effect<A, E, R>,
  span: string,
  signal?: AbortSignal
): Promise<A> => {
  const exit = await runner.run(effect, span, { signal });
  if (Exit.isSuccess(exit)) {
    return exit.value;
  }
  throw toEffectQueryError(exit.cause);
};

const wrapQueryFn = (runner: EffectQueryRunner, queryFn: unknown): unknown => {
  // `skipToken` (or a missing queryFn) is passed through so TanStack Query can handle it natively.
  if (typeof queryFn !== "function") {
    return queryFn;
  }
  const effectFn = queryFn as AnyEffectFn;
  return (context: QueryFunctionContextLike) =>
    runToPromise(
      runner,
      // A function that throws instead of returning an Effect surfaces as an `EffectQueryDefect`.
      Effect.suspend(() => effectFn(context as never)),
      spanNameFromKey(context.queryKey, DEFAULT_QUERY_SPAN),
      context.signal
    );
};

const wrapMutationFn = (
  runner: EffectQueryRunner,
  mutationFn: unknown
): unknown => {
  if (typeof mutationFn !== "function") {
    return mutationFn;
  }
  const effectFn = mutationFn as AnyEffectFn;
  return (variables: unknown, context?: MutationFunctionContextLike) =>
    runToPromise(
      runner,
      Effect.suspend(() => effectFn(variables as never, context as never)),
      spanNameFromKey(context?.mutationKey, DEFAULT_MUTATION_SPAN)
    );
};

/** Keeps the wrapped function stable while the getter keeps returning the same function. */
const memoizeLast = (
  wrap: (fn: unknown) => unknown,
  read: () => unknown
): (() => unknown) => {
  let last: { readonly input: unknown; readonly output: unknown } | undefined;
  return () => {
    const input = read();
    if (last === undefined || last.input !== input) {
      last = { input, output: wrap(input) };
    }
    return last.output;
  };
};

/**
 * Copies `options`, replacing `key` with `wrap(options[key])`.
 *
 * Property descriptors are copied rather than spread, so getters (e.g. Solid's
 * `get enabled() { return id() !== undefined }`) stay live instead of being read once. A getter
 * for `key` itself stays a getter, wrapped on every access.
 */
const withWrapped = <T extends object>(
  options: T,
  key: "mutationFn" | "queryFn",
  wrap: (fn: unknown) => unknown
): T => {
  const descriptors: PropertyDescriptorMap =
    Object.getOwnPropertyDescriptors(options);
  const descriptor = descriptors[key];
  const wrapped: PropertyDescriptor = descriptor?.get
    ? {
        configurable: true,
        enumerable: true,
        get: memoizeLast(wrap, descriptor.get.bind(options)),
      }
    : {
        configurable: true,
        enumerable: true,
        value: wrap((options as Record<string, unknown>)[key]),
        writable: true,
      };
  descriptors[key] = wrapped;
  return Object.defineProperties({}, descriptors) as T;
};

/**
 * Runtime implementation shared by every framework adapter. TanStack Query's own
 * `queryOptions` helpers are identity functions, so the only work left is turning the
 * Effect returning functions into Promise returning ones.
 */
export interface EffectQueryOptionFactories {
  readonly infiniteQueryOptions: <T extends QueryOptionsLike>(options: T) => T;
  readonly mutationOptions: <T extends MutationOptionsLike>(options: T) => T;
  readonly queryOptions: <T extends QueryOptionsLike>(options: T) => T;
}

/** The runtime handle every adapter's `createEffectQuery` result exposes. */
export interface EffectQueryRuntimeHandle<Input> {
  /**
   * Disposes the underlying `ManagedRuntime`, running the finalizers of the scoped services of
   * the layer. Call it when the factories are no longer used, e.g. on HMR or at the end of a
   * server request. Queries started afterwards die with an `EffectQueryDefect`.
   */
  readonly dispose: () => Promise<void>;
  /**
   * The `ManagedRuntime` the Effects run on, e.g. to run an Effect outside of a query with
   * `runtime.runPromise`. For `createEffectQuery` this is replaced when building the layer dies.
   */
  readonly runtime: ManagedRuntime.ManagedRuntime<Input, never>;
}

export const makeOptionFactories = (
  runner: EffectQueryRunner
): EffectQueryOptionFactories & EffectQueryRuntimeHandle<never> => {
  const queryOptions = <T extends QueryOptionsLike>(options: T): T =>
    withWrapped(options, "queryFn", (queryFn) => wrapQueryFn(runner, queryFn));

  return {
    dispose: () => runner.dispose(),
    infiniteQueryOptions: queryOptions,
    mutationOptions: (options) =>
      withWrapped(options, "mutationFn", (mutationFn) =>
        wrapMutationFn(runner, mutationFn)
      ),
    queryOptions,
    get runtime() {
      return runner.runtime;
    },
  };
};

export const runnerFromLayer = <Input>(
  layer: Layer<Input, never, never>
): EffectQueryRunner => EffectQueryRunner.fromLayer(layer);

export const runnerFromManagedRuntime = <Input>(
  runtime: ManagedRuntime.ManagedRuntime<Input, never>
): EffectQueryRunner => new EffectQueryRunner(runtime);

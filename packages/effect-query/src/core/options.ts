import { Cause, type Effect, Exit, ManagedRuntime, Option } from "effect";
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
    return new EffectQueryFailure(
      Cause.pretty(cause),
      failure.value as never,
      cause as Cause.Cause<never>
    );
  }
  return new EffectQueryDefect(Cause.pretty(cause), cause);
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
      effectFn(context as never),
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
      effectFn(variables as never, context as never),
      spanNameFromKey(context?.mutationKey, DEFAULT_MUTATION_SPAN)
    );
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

export const makeOptionFactories = (
  runner: EffectQueryRunner
): EffectQueryOptionFactories => {
  const queryOptions = <T extends QueryOptionsLike>(options: T): T => ({
    ...options,
    queryFn: wrapQueryFn(runner, options.queryFn),
  });

  return {
    infiniteQueryOptions: queryOptions,
    mutationOptions: (options) => ({
      ...options,
      mutationFn: wrapMutationFn(runner, options.mutationFn),
    }),
    queryOptions,
  };
};

export const runnerFromLayer = <Input>(
  layer: Layer<Input, never, never>
): EffectQueryRunner => new EffectQueryRunner(ManagedRuntime.make(layer));

export const runnerFromManagedRuntime = <Input>(
  runtime: ManagedRuntime.ManagedRuntime<Input, never>
): EffectQueryRunner => new EffectQueryRunner(runtime);

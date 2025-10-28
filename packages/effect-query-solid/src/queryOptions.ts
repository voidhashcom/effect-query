import {
  type DefinedInitialDataOptions,
  type QueryFunction,
  type QueryFunctionContext,
  queryOptions,
  type UndefinedInitialDataOptions,
  type UseQueryOptions,
} from "@tanstack/solid-query";
import { Cause, type Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";
import type { EffectQueryQueryKey } from "./types";

type EffectQueryQueryFn<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
  TPageParam = never,
> = (
  context: QueryFunctionContext<TQueryKey, TPageParam>
) => Effect.Effect<TFnResult, TFnErrorResult, TFnRequirements>;

type EffectQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>;

type EffectQueryDefinedInitialDataOptions<
  TQueryFnData,
  TError,
  TData = TQueryFnData,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>;

export type EffectQueryOptionsInput<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = Omit<
  | EffectQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnResult,
      TQueryKey
    >
  | EffectQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnResult,
      TQueryKey
    >,
  "queryFn" | "queryKey"
> & {
  queryKey: EffectQueryQueryKey;
  queryFn: EffectQueryQueryFn<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    EffectQueryQueryKey
  >;
};

/**
 * @internal
 */
export function effectQueryQueryOptions<
  // biome-ignore lint/suspicious/noExplicitAny: generic
  TManagedRuntime extends ManagedRuntime<any, never>,
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TFnRequirements,
>(
  inputOptions: EffectQueryOptionsInput<
    TFnResult,
    TFnErrorResult,
    TFnRequirements
  >,
  context: {
    runner: EffectQueryRunner<TManagedRuntime>;
    signal?: AbortSignal;
  }
) {
  const [spanName] = inputOptions.queryKey;

  const queryFn: QueryFunction<TFnResult, EffectQueryQueryKey> = async (
    queryFnContext
  ) => {
    const effect = inputOptions.queryFn(queryFnContext);
    const result = await context.runner.run(effect, spanName, {
      signal: context.signal,
    });
    return Exit.match(result, {
      onSuccess: (value) => value,
      onFailure: (cause) => {
        if (cause._tag === "Fail") {
          const failure = cause.error;
          throw new EffectQueryFailure(Cause.pretty(cause), failure, cause);
        }
        throw new EffectQueryDefect(Cause.pretty(cause), cause);
      },
    });
  };

  // The as UseQueryOptions is a workaround to set the correct error type. React Query has no way to infer the error type from the Effect.
  return queryOptions({
    ...inputOptions,
    queryKey: inputOptions.queryKey,
    queryFn,
  }) as unknown as UseQueryOptions<
    TFnResult,
    [TFnErrorResult] extends [never]
      ? EffectQueryDefect<unknown>
      : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>,
    TFnResult,
    EffectQueryQueryKey
  >;
}

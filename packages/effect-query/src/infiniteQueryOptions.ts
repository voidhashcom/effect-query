import {
  type DefinedInitialDataInfiniteOptions,
  type InfiniteData,
  infiniteQueryOptions,
  type QueryFunctionContext,
  type SkipToken,
  type UndefinedInitialDataInfiniteOptions,
  type UnusedSkipTokenInfiniteOptions,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { Cause, type Effect, Exit } from "effect";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";
import type { EffectQueryQueryKey } from "./types";

type EffectInfiniteQueryQueryFn<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
  TPageParam = never,
> = (
  context: QueryFunctionContext<TQueryKey, TPageParam>
) => Effect.Effect<TFnResult, TFnErrorResult, TFnRequirements>;

type EffectInfiniteQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TError,
  TData = InfiniteData<TQueryFnData, unknown>,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = UndefinedInitialDataInfiniteOptions<TQueryFnData, TError, TData, TQueryKey>;

type EffectInfiniteQueryUnusedSkipTokenOptions<
  TQueryFnData,
  TError,
  TData = InfiniteData<TQueryFnData, unknown>,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = UnusedSkipTokenInfiniteOptions<TQueryFnData, TError, TData, TQueryKey>;

type EffectInfiniteQueryDefinedInitialDataOptions<
  TQueryFnData,
  TError,
  TData = InfiniteData<TQueryFnData, unknown>,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = DefinedInitialDataInfiniteOptions<TQueryFnData, TError, TData, TQueryKey>;

export type EffectInfiniteQueryOptionsInput<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TQueryKey extends EffectQueryQueryKey = EffectQueryQueryKey,
> = Omit<
  | EffectInfiniteQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnResult,
      TQueryKey
    >
  | EffectInfiniteQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnResult,
      TQueryKey
    >
  | EffectInfiniteQueryUnusedSkipTokenOptions<
      TFnResult,
      TFnErrorResult,
      TFnResult,
      TQueryKey
    >,
  "queryFn" | "queryKey"
> & {
  queryKey: EffectQueryQueryKey;
  queryFn: EffectInfiniteQueryQueryFn<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    EffectQueryQueryKey
  >;
};

/**
 * @internal
 */
export function effectInfiniteQueryOptions<
  TRuntimeInput,
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TFnRequirements,
>(
  inputOptions: EffectInfiniteQueryOptionsInput<
    TFnResult,
    TFnErrorResult,
    TFnRequirements
  >,
  context: {
    runner: EffectQueryRunner<TRuntimeInput>;
    signal?: AbortSignal;
  }
) {
  const [spanName] = inputOptions.queryKey;

  const queryFn: Exclude<
    UseInfiniteQueryOptions<
      TFnResult,
      TFnErrorResult,
      InfiniteData<TFnResult, unknown>,
      EffectQueryQueryKey,
      unknown
    >["queryFn"],
    SkipToken | undefined
  > = async (queryFnContext) => {
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
  return infiniteQueryOptions({
    ...inputOptions,
    queryKey: inputOptions.queryKey as EffectQueryQueryKey,
    queryFn,
  }) as UseInfiniteQueryOptions<
    TFnResult,
    [TFnErrorResult] extends [never]
      ? EffectQueryDefect<unknown>
      : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>,
    TFnResult,
    EffectQueryQueryKey
  >;
}

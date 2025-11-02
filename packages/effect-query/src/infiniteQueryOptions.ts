import {
  type DefinedInitialDataInfiniteOptions,
  type InfiniteData,
  infiniteQueryOptions,
  type QueryFunctionContext,
  type QueryKey,
  type SkipToken,
  skipToken,
  type UndefinedInitialDataInfiniteOptions,
  type UnusedSkipTokenInfiniteOptions,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import { Cause, type Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";

type InferInfiniteQueryErrorResult<TFnErrorResult extends { _tag: string }> = [
  TFnErrorResult,
] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>;

export type EffectInfiniteQueryQueryFn<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TPageParam,
> = (
  context: QueryFunctionContext<QueryKey, TPageParam>
) => Effect.Effect<TFnResult, TFnErrorResult, TFnRequirements>;

// Helper type to transform base options to Effect input options
type ToEffectInputOptions<
  TBaseOptions,
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TPageParam,
> = Omit<TBaseOptions, "queryFn"> & {
  queryFn:
    | EffectInfiniteQueryQueryFn<
        TQueryFnData,
        TError,
        TRequirements,
        TPageParam
      >
    | SkipToken;
};

// Helper type to transform input options to result options
type ToEffectResultOptions<
  TInputOptions,
  TQueryFnData,
  TError extends { _tag: string },
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
  TExcludeSkipToken extends boolean = false,
> = Omit<TInputOptions, "queryFn"> & {
  queryFn: TExcludeSkipToken extends true
    ? Exclude<
        UseInfiniteQueryOptions<
          TQueryFnData,
          TError,
          TData,
          TQueryKey,
          TPageParam
        >["queryFn"],
        SkipToken | undefined
      >
    : UseInfiniteQueryOptions<
        TQueryFnData,
        TError,
        TData,
        TQueryKey,
        TPageParam
      >["queryFn"];
};

// Input option types
export type EffectInfiniteQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = ToEffectInputOptions<
  UndefinedInitialDataInfiniteOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >,
  TQueryFnData,
  TError,
  TRequirements,
  TPageParam
>;

export type EffectInfiniteQueryDefinedInitialDataOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = ToEffectInputOptions<
  DefinedInitialDataInfiniteOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >,
  TQueryFnData,
  TError,
  TRequirements,
  TPageParam
>;

export type EffectInfiniteQueryUnusedSkipTokenOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = ToEffectInputOptions<
  UnusedSkipTokenInfiniteOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryKey,
    TPageParam
  >,
  TQueryFnData,
  TError,
  TRequirements,
  TPageParam
>;

// Result option types - transform error type and queryFn
export type EffectInfiniteQueryUndefinedInitialDataOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = ToEffectResultOptions<
  EffectInfiniteQueryUndefinedInitialDataOptions<
    TQueryFnData,
    InferInfiniteQueryErrorResult<TError>,
    TRequirements,
    TData,
    TQueryKey,
    TPageParam
  >,
  TQueryFnData,
  InferInfiniteQueryErrorResult<TError>,
  TData,
  TQueryKey,
  TPageParam,
  false
>;

export type EffectInfiniteQueryDefinedInitialDataOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = ToEffectResultOptions<
  EffectInfiniteQueryDefinedInitialDataOptions<
    TQueryFnData,
    InferInfiniteQueryErrorResult<TError>,
    TRequirements,
    TData,
    TQueryKey,
    TPageParam
  >,
  TQueryFnData,
  InferInfiniteQueryErrorResult<TError>,
  TData,
  TQueryKey,
  TPageParam,
  false
>;

export type EffectInfiniteQueryUnusedSkipTokenOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> = ToEffectResultOptions<
  EffectInfiniteQueryUnusedSkipTokenOptions<
    TQueryFnData,
    InferInfiniteQueryErrorResult<TError>,
    TRequirements,
    TData,
    TQueryKey,
    TPageParam
  >,
  TQueryFnData,
  InferInfiniteQueryErrorResult<TError>,
  TData,
  TQueryKey,
  TPageParam,
  true
>;

// Union types for convenience
export type EffectInfiniteQueryOptionsInput<
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TFnRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> =
  | EffectInfiniteQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TQueryKey,
      TPageParam
    >
  | EffectInfiniteQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TQueryKey,
      TPageParam
    >
  | EffectInfiniteQueryUnusedSkipTokenOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TQueryKey,
      TPageParam
    >;

export type EffectInfiniteQueryOptionsResult<
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TRequirements,
  TData,
  TQueryKey extends QueryKey,
  TPageParam,
> =
  | EffectInfiniteQueryUndefinedInitialDataOptionsResult<
      TFnResult,
      TFnErrorResult,
      TRequirements,
      TData,
      TQueryKey,
      TPageParam
    >
  | EffectInfiniteQueryDefinedInitialDataOptionsResult<
      TFnResult,
      TFnErrorResult,
      TRequirements,
      TData,
      TQueryKey,
      TPageParam
    >
  | EffectInfiniteQueryUnusedSkipTokenOptionsResult<
      TFnResult,
      TFnErrorResult,
      TRequirements,
      TData,
      TQueryKey,
      TPageParam
    >;

export function createEffectInfiniteQueryOptions<Input>(
  runner: EffectQueryRunner<ManagedRuntime<Input, never>>
) {
  function effectInfiniteQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
    TData = InfiniteData<TFnResult>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    inputOptions: EffectInfiniteQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TQueryKey,
      TPageParam
    >
  ): EffectInfiniteQueryDefinedInitialDataOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    TData,
    TQueryKey,
    TPageParam
  >;
  function effectInfiniteQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    inputOptions: EffectInfiniteQueryUnusedSkipTokenOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      InfiniteData<TFnResult>,
      TQueryKey,
      TPageParam
    >
  ): EffectInfiniteQueryUnusedSkipTokenOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    InfiniteData<TFnResult>,
    TQueryKey,
    TPageParam
  >;
  function effectInfiniteQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    inputOptions: EffectInfiniteQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      InfiniteData<TFnResult>,
      TQueryKey,
      TPageParam
    >
  ): EffectInfiniteQueryUndefinedInitialDataOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    InfiniteData<TFnResult>,
    TQueryKey,
    TPageParam
  >;
  function effectInfiniteQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
  >(
    inputOptions: EffectInfiniteQueryOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      InfiniteData<TFnResult>,
      TQueryKey,
      TPageParam
    >
  ): EffectInfiniteQueryOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    InfiniteData<TFnResult>,
    TQueryKey,
    TPageParam
  > {
    const [spanName] = inputOptions.queryKey;

    const queryFn: EffectInfiniteQueryOptionsResult<
      TFnResult,
      InferInfiniteQueryErrorResult<TFnErrorResult>,
      TFnRequirements,
      InfiniteData<TFnResult>,
      TQueryKey,
      TPageParam
    >["queryFn"] = async (queryFnContext) => {
      // This is there as a workaround to avoid type errors.
      if (inputOptions.queryFn === skipToken) {
        throw new Error("Query function is skipped");
      }

      const effect = inputOptions.queryFn(queryFnContext);
      const result = await runner.run(
        effect,
        typeof spanName === "string" ? spanName : "effect-query",
        {
          signal: queryFnContext.signal,
        }
      );
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

    // The as UseInfiniteQueryOptions is a workaround to set the correct error type. React Query has no way to infer the error type from the Effect.
    return infiniteQueryOptions({
      ...inputOptions,
      queryFn,
    }) as unknown as EffectInfiniteQueryOptionsResult<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      InfiniteData<TFnResult>,
      TQueryKey,
      TPageParam
    >;
  }

  return effectInfiniteQueryOptions;
}

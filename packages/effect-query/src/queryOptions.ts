import {
  // type DataTag,
  type DefinedInitialDataOptions,
  type QueryFunction,
  type QueryFunctionContext,
  type QueryKey,
  queryOptions,
  type SkipToken,
  skipToken,
  type UndefinedInitialDataOptions,
  type UnusedSkipTokenOptions,
} from "@tanstack/react-query";
import { Cause, type Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";

// type EffectQueryQueryKey<TQueryKey, TQueryFnData, TError> = DataTag<
//   TQueryKey,
//   TQueryFnData,
//   TError
// >;

type InferQueryErrorResult<TFnErrorResult extends { _tag: string }> = [
  TFnErrorResult,
] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>;

export type EffectQueryQueryFn<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TPageParam = never,
> = (
  context: QueryFunctionContext<QueryKey, TPageParam>
) => Effect.Effect<TFnResult, TFnErrorResult, TFnRequirements>;

export type EffectQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData = TQueryFnData,
> = Omit<
  UndefinedInitialDataOptions<TQueryFnData, TError, TData>,
  "queryFn"
> & {
  queryFn: EffectQueryQueryFn<TQueryFnData, TError, TRequirements> | SkipToken;
};

export type EffectQueryUndefinedInitialDataOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TData = TQueryFnData,
> = Omit<
  EffectQueryUndefinedInitialDataOptions<
    TQueryFnData,
    InferQueryErrorResult<TError>,
    TData
  >,
  "queryFn"
> & {
  queryFn: QueryFunction<TQueryFnData, QueryKey>;
};

export type EffectQueryUnusedSkipTokenOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData = TQueryFnData,
> = Omit<UnusedSkipTokenOptions<TQueryFnData, TError, TData>, "queryFn"> & {
  queryFn: EffectQueryQueryFn<TQueryFnData, TError, TRequirements> | SkipToken;
};

export type EffectQueryUnusedSkipTokenOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TData = TQueryFnData,
> = Omit<
  EffectQueryUnusedSkipTokenOptions<
    TQueryFnData,
    InferQueryErrorResult<TError>,
    TData
  >,
  "queryFn"
> & {
  queryFn: QueryFunction<TQueryFnData, QueryKey>;
};

export type EffectQueryDefinedInitialDataOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData = TQueryFnData,
> = Omit<DefinedInitialDataOptions<TQueryFnData, TError, TData>, "queryFn"> & {
  queryFn: EffectQueryQueryFn<TQueryFnData, TError, TRequirements> | SkipToken;
};

export type EffectQueryDefinedInitialDataOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TData = TQueryFnData,
> = Omit<
  EffectQueryDefinedInitialDataOptions<
    TQueryFnData,
    InferQueryErrorResult<TError>,
    TData
  >,
  "queryFn"
> & {
  queryFn: QueryFunction<TQueryFnData, QueryKey>;
};

export type EffectQueryOptionsInput<
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TFnRequirements,
> =
  | EffectQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TFnResult
    >
  | EffectQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TFnResult
    >
  | EffectQueryUnusedSkipTokenOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TFnResult
    >;

export type EffectQueryOptionsResult<
  TFnResult,
  TFnErrorResult extends { _tag: string },
> =
  | EffectQueryUndefinedInitialDataOptionsResult<
      TFnResult,
      TFnErrorResult,
      TFnResult
    >
  | EffectQueryDefinedInitialDataOptionsResult<
      TFnResult,
      TFnErrorResult,
      TFnResult
    >
  | EffectQueryUnusedSkipTokenOptionsResult<
      TFnResult,
      TFnErrorResult,
      TFnResult
    >;

export function createEffectQueryQueryOptions<Input>(
  runner: EffectQueryRunner<ManagedRuntime<Input, never>>
) {
  function effectQueryQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
  >(
    inputOptions: EffectQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TFnResult
    >
  ): EffectQueryDefinedInitialDataOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnResult
  >;
  function effectQueryQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
  >(
    inputOptions: EffectQueryUnusedSkipTokenOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TFnResult
    >
  ): EffectQueryUnusedSkipTokenOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnResult
  >;
  function effectQueryQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
  >(
    inputOptions: EffectQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TFnResult
    >
  ): EffectQueryUndefinedInitialDataOptionsResult<
    TFnResult,
    TFnErrorResult,
    TFnResult
  >;
  function effectQueryQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
  >(
    inputOptions: EffectQueryOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements
    >
  ): EffectQueryOptionsResult<TFnResult, TFnErrorResult> {
    const [spanName] = inputOptions.queryKey;

    const queryFn: EffectQueryOptionsResult<
      TFnResult,
      InferQueryErrorResult<TFnErrorResult>
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

    // The as UseQueryOptions is a workaround to set the correct error type. React Query has no way to infer the error type from the Effect.
    return queryOptions({
      ...inputOptions,
      queryFn,
    }) as EffectQueryOptionsResult<TFnResult, TFnErrorResult>;
  }

  return effectQueryQueryOptions;
}

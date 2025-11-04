import {
  type DefinedInitialDataOptions,
  type QueryFunction,
  type QueryFunctionContext,
  type QueryKey,
  queryOptions,
  skipToken,
  type UndefinedInitialDataOptions,
  type UnusedSkipTokenOptions,
} from "@tanstack/react-query";
import { Cause, Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";
import type { InferQueryErrorResult, SkipTokenLike } from "./types";

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
  queryFn:
    | EffectQueryQueryFn<TQueryFnData, TError, TRequirements>
    | SkipTokenLike;
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
  queryFn:
    | EffectQueryQueryFn<TQueryFnData, TError, TRequirements>
    | SkipTokenLike;
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
  queryFn: EffectQueryQueryFn<TQueryFnData, TError, TRequirements> | symbol;
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

export type ExtractQueryResult<TInput> =
  TInput extends EffectQueryDefinedInitialDataOptions<
    infer _R,
    infer _E extends { _tag: string },
    infer _Req,
    infer D
  >
    ? D
    : TInput extends EffectQueryUnusedSkipTokenOptions<
          infer _R,
          infer _E extends { _tag: string },
          infer _Req,
          infer D
        >
      ? D
      : TInput extends EffectQueryUndefinedInitialDataOptions<
            infer _R,
            infer _E extends { _tag: string },
            infer _Req,
            infer D
          >
        ? D
        : never;

export type EffectQueryOptionsReturn<TInput> =
  TInput extends EffectQueryDefinedInitialDataOptions<
    infer R,
    infer E extends { _tag: string },
    infer _Req,
    infer D
  >
    ? EffectQueryDefinedInitialDataOptionsResult<R, E, D>
    : TInput extends EffectQueryUnusedSkipTokenOptions<
          infer R,
          infer E extends { _tag: string },
          infer _Req,
          infer D
        >
      ? EffectQueryUnusedSkipTokenOptionsResult<R, E, D>
      : TInput extends EffectQueryUndefinedInitialDataOptions<
            infer R,
            infer E extends { _tag: string },
            infer _Req,
            infer D
          >
        ? EffectQueryUndefinedInitialDataOptionsResult<R, E, D>
        : never;

export function createEffectQueryQueryOptions<Input>(
  runner: EffectQueryRunner<ManagedRuntime<Input, never>>
) {
  function effectQueryQueryOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
    TInput extends EffectQueryOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements
    >,
  >(
    inputOptions: TInput
  ): EffectQueryOptionsReturn<
    EffectQueryOptionsInput<TFnResult, TFnErrorResult, TFnRequirements>
  > {
    const [spanName] = inputOptions.queryKey;

    const queryFn: EffectQueryOptionsReturn<TInput>["queryFn"] = async (
      queryFnContext
    ) => {
      // Assert
      if (
        typeof inputOptions.queryFn === "symbol" &&
        inputOptions.queryFn !== skipToken
      ) {
        // biome-ignore lint/suspicious/noConsole: console.warn is used to warn the user about the mistake
        console.warn(
          "You passed a symbol as query function, but it is not the skipToken symbol. This is probably a mistake."
        );
      }

      const effect =
        typeof inputOptions.queryFn === "function"
          ? inputOptions.queryFn(queryFnContext)
          : Effect.succeed(undefined);

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
      }) as ExtractQueryResult<TInput>;
    };

    // If the query is disabled or the queryFn is skipToken, the query is not enabled.
    const isEnabled = !(
      inputOptions.enabled === false || inputOptions.queryFn === skipToken
    );

    // The as UseQueryOptions is a workaround to set the correct error type. React Query has no way to infer the error type from the Effect.
    return queryOptions({
      ...inputOptions,
      enabled: isEnabled,
      queryFn,
    }) as unknown as EffectQueryOptionsReturn<TInput>;
  }

  return effectQueryQueryOptions;
}

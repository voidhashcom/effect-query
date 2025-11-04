import {
  type DefinedInitialDataInfiniteOptions,
  infiniteQueryOptions,
  type QueryFunction,
  type QueryFunctionContext,
  type QueryKey,
  skipToken,
  type UndefinedInitialDataInfiniteOptions,
  type UnusedSkipTokenInfiniteOptions,
} from "@tanstack/react-query";
import { Cause, Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";
import type { InfiniteData, SkipTokenLike } from "./types";

export type EffectInfiniteQueryQueryFn<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TPageParam,
> = (
  context: QueryFunctionContext<QueryKey, TPageParam>
) => Effect.Effect<TFnResult, TFnErrorResult, TFnRequirements>;

export type InferInfiniteQueryErrorResult<
  TFnErrorResult extends { _tag: string },
> = [TFnErrorResult] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>;

export type ToEffectInputOptions<
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
    | SkipTokenLike;
};

export type EffectInfiniteQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
> = ToEffectInputOptions<
  UndefinedInitialDataInfiniteOptions<
    TQueryFnData,
    TError,
    TData,
    QueryKey,
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
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
> = ToEffectInputOptions<
  DefinedInitialDataInfiniteOptions<
    TQueryFnData,
    TError,
    TData,
    QueryKey,
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
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
> = ToEffectInputOptions<
  UnusedSkipTokenInfiniteOptions<
    TQueryFnData,
    TError,
    TData,
    QueryKey,
    TPageParam
  >,
  TQueryFnData,
  TError,
  TRequirements,
  TPageParam
>;

export type EffectInfiniteQueryUndefinedInitialDataOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TPageParam,
> = Omit<
  EffectInfiniteQueryUndefinedInitialDataOptions<
    TQueryFnData,
    InferInfiniteQueryErrorResult<TError>,
    TRequirements,
    TData,
    TPageParam
  >,
  "queryFn"
> & {
  queryFn: QueryFunction<TQueryFnData, QueryKey, TPageParam>;
};

export type EffectInfiniteQueryDefinedInitialDataOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TPageParam,
> = Omit<
  EffectInfiniteQueryDefinedInitialDataOptions<
    TQueryFnData,
    InferInfiniteQueryErrorResult<TError>,
    TRequirements,
    TData,
    TPageParam
  >,
  "queryFn"
> & {
  queryFn: QueryFunction<TQueryFnData, QueryKey, TPageParam>;
};

export type EffectInfiniteQueryUnusedSkipTokenOptionsResult<
  TQueryFnData,
  TError extends { _tag: string },
  TRequirements,
  TData,
  TPageParam,
> = Omit<
  EffectInfiniteQueryUnusedSkipTokenOptions<
    TQueryFnData,
    InferInfiniteQueryErrorResult<TError>,
    TRequirements,
    TData,
    TPageParam
  >,
  "queryFn"
> & {
  queryFn: QueryFunction<TQueryFnData, QueryKey, TPageParam>;
};

export type EffectInfiniteQueryOptionsInput<
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TFnRequirements,
  TData = InfiniteData<TFnResult>,
  TPageParam = unknown,
> =
  | EffectInfiniteQueryUndefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TPageParam
    >
  | EffectInfiniteQueryDefinedInitialDataOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TPageParam
    >
  | EffectInfiniteQueryUnusedSkipTokenOptions<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TData,
      TPageParam
    >;

export type EffectInfiniteQueryOptionsReturn<TInput> =
  TInput extends EffectInfiniteQueryDefinedInitialDataOptions<
    infer R,
    infer E extends { _tag: string },
    infer Req,
    infer D,
    infer PP
  >
    ? EffectInfiniteQueryDefinedInitialDataOptionsResult<R, E, Req, D, PP>
    : TInput extends EffectInfiniteQueryUnusedSkipTokenOptions<
          infer R,
          infer E extends { _tag: string },
          infer Req,
          infer D,
          infer PP
        >
      ? EffectInfiniteQueryUnusedSkipTokenOptionsResult<R, E, Req, D, PP>
      : TInput extends EffectInfiniteQueryUndefinedInitialDataOptions<
            infer R,
            infer E extends { _tag: string },
            infer Req,
            infer D,
            infer PP
          >
        ? EffectInfiniteQueryUndefinedInitialDataOptionsResult<R, E, Req, D, PP>
        : never;

export function createEffectInfiniteQueryOptions<Input>(
  runner: EffectQueryRunner<ManagedRuntime<Input, never>>
) {
  function effectInfiniteQueryOptions<
    TQueryFnData,
    TError extends { _tag: string },
    TRequirements,
    TData = InfiniteData<TQueryFnData>,
    TPageParam = unknown,
  >(
    inputOptions: EffectInfiniteQueryOptionsInput<
      TQueryFnData,
      TError,
      TRequirements,
      TData,
      TPageParam
    >
  ): EffectInfiniteQueryOptionsReturn<
    EffectInfiniteQueryOptionsInput<
      TQueryFnData,
      TError,
      TRequirements,
      TData,
      TPageParam
    >
  > {
    const [spanName] = inputOptions.queryKey;

    const queryFn: EffectInfiniteQueryOptionsReturn<
      EffectInfiniteQueryOptionsInput<
        TQueryFnData,
        TError,
        TRequirements,
        TData,
        TPageParam
      >
    >["queryFn"] = async (queryFnContext) => {
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
        onSuccess: (value) => value as TQueryFnData,
        onFailure: (cause) => {
          if (cause._tag === "Fail") {
            const failure = cause.error;
            throw new EffectQueryFailure(Cause.pretty(cause), failure, cause);
          }
          throw new EffectQueryDefect(Cause.pretty(cause), cause);
        },
      });
    };

    const isEnabled = !(
      inputOptions.enabled === false || inputOptions.queryFn === skipToken
    );

    return infiniteQueryOptions({
      ...inputOptions,
      enabled: isEnabled,
      queryFn,
    }) as unknown as EffectInfiniteQueryOptionsReturn<
      EffectInfiniteQueryOptionsInput<
        TQueryFnData,
        TError,
        TRequirements,
        TData,
        TPageParam
      >
    >;
  }

  return effectInfiniteQueryOptions;
}

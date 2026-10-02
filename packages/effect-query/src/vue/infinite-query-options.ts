import type {
  DefinedInitialDataInfiniteOptions,
  InfiniteData,
  QueryKey,
  QueryKeyWithDataTag,
  SkipToken,
  UndefinedInitialDataInfiniteOptions,
  UseInfiniteQueryOptions,
} from "@tanstack/vue-query";
import type { Effect } from "effect";
import type { InferQueryErrorResult, TaggedFailure } from "../core/types";
import type { ContextOf, PlainOptions } from "./query-options";

/**
 * Infinite query function context with the query key unwrapped from refs, exactly as
 * vue-query passes it.
 */
export type VueInfiniteQueryFunctionContext<
  TQueryKey extends QueryKey,
  TPageParam,
> = ContextOf<
  PlainOptions<
    UseInfiniteQueryOptions<unknown, unknown, unknown, TQueryKey, TPageParam>
  >["queryFn"]
>;

export type EffectInfiniteQueryQueryFn<
  TQueryFnData,
  TFailure,
  TRequirements,
  TPageParam,
  TQueryKey extends QueryKey = QueryKey,
> = (
  context: VueInfiniteQueryFunctionContext<TQueryKey, TPageParam>
) => Effect.Effect<TQueryFnData, TFailure, TRequirements>;

// ============================================================================
// INPUT OPTIONS
// ============================================================================

export type EffectInfiniteQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  PlainOptions<
    UndefinedInitialDataInfiniteOptions<
      TQueryFnData,
      InferQueryErrorResult<TFailure>,
      TData,
      TQueryKey,
      TPageParam
    >
  >,
  "queryFn"
> & {
  queryFn:
    | EffectInfiniteQueryQueryFn<
        TQueryFnData,
        TFailure,
        TRequirements,
        TPageParam,
        TQueryKey
      >
    | SkipToken;
};

export type EffectInfiniteQueryDefinedInitialDataOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  PlainOptions<
    DefinedInitialDataInfiniteOptions<
      TQueryFnData,
      InferQueryErrorResult<TFailure>,
      TData,
      TQueryKey,
      TPageParam
    >
  >,
  "queryFn"
> & {
  queryFn:
    | EffectInfiniteQueryQueryFn<
        TQueryFnData,
        TFailure,
        TRequirements,
        TPageParam,
        TQueryKey
      >
    | SkipToken;
};

// ============================================================================
// RESULT OPTIONS (plain vue-query options with an inferred error type)
// ============================================================================

export type EffectInfiniteQueryUndefinedInitialDataOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = UndefinedInitialDataInfiniteOptions<
  TQueryFnData,
  InferQueryErrorResult<TFailure>,
  TData,
  TQueryKey,
  TPageParam
> &
  QueryKeyWithDataTag<
    TQueryKey,
    InfiniteData<TQueryFnData>,
    InferQueryErrorResult<TFailure>
  >;

export type EffectInfiniteQueryDefinedInitialDataOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = DefinedInitialDataInfiniteOptions<
  TQueryFnData,
  InferQueryErrorResult<TFailure>,
  TData,
  TQueryKey,
  TPageParam
> &
  QueryKeyWithDataTag<
    TQueryKey,
    InfiniteData<TQueryFnData>,
    InferQueryErrorResult<TFailure>
  >;

/**
 * Mirrors the overloads of vue-query's `infiniteQueryOptions`, with an Effect returning
 * `queryFn`. The error type of the returned options is inferred from the Effect's failure channel.
 */
export interface EffectInfiniteQueryOptionsFunction<Input> {
  <
    TQueryFnData,
    TFailure extends TaggedFailure = never,
    TRequirements extends Input = never,
    TData = InfiniteData<TQueryFnData>,
    TPageParam = unknown,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: EffectInfiniteQueryDefinedInitialDataOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TPageParam,
      TQueryKey
    >
  ): EffectInfiniteQueryDefinedInitialDataOptionsResult<
    TQueryFnData,
    TFailure,
    TData,
    TPageParam,
    TQueryKey
  >;
  <
    TQueryFnData,
    TFailure extends TaggedFailure = never,
    TRequirements extends Input = never,
    TData = InfiniteData<TQueryFnData>,
    TPageParam = unknown,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: EffectInfiniteQueryUndefinedInitialDataOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TPageParam,
      TQueryKey
    >
  ): EffectInfiniteQueryUndefinedInitialDataOptionsResult<
    TQueryFnData,
    TFailure,
    TData,
    TPageParam,
    TQueryKey
  >;
}

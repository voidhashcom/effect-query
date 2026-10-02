import type {
  DefinedInitialDataInfiniteOptions,
  InfiniteData,
  QueryKey,
  QueryKeyWithDataTag,
  SkipToken,
  UndefinedInitialDataInfiniteOptions,
  UnusedSkipTokenInfiniteOptions,
} from "@tanstack/react-query";
import type { InferQueryErrorResult, TaggedFailure } from "../core/types";
import type { EffectQueryQueryFn } from "./query-options";

export type EffectInfiniteQueryQueryFn<
  TQueryFnData,
  TFailure,
  TRequirements,
  TPageParam,
  TQueryKey extends QueryKey = QueryKey,
> = EffectQueryQueryFn<
  TQueryFnData,
  TFailure,
  TRequirements,
  TPageParam,
  TQueryKey
>;

/** @deprecated Use `InferQueryErrorResult`. */
export type InferInfiniteQueryErrorResult<TFailure extends TaggedFailure> =
  InferQueryErrorResult<TFailure>;

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
  UndefinedInitialDataInfiniteOptions<
    TQueryFnData,
    InferQueryErrorResult<TFailure>,
    TData,
    TQueryKey,
    TPageParam
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

export type EffectInfiniteQueryUnusedSkipTokenOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UnusedSkipTokenInfiniteOptions<
    TQueryFnData,
    InferQueryErrorResult<TFailure>,
    TData,
    TQueryKey,
    TPageParam
  >,
  "queryFn"
> & {
  queryFn: EffectInfiniteQueryQueryFn<
    TQueryFnData,
    TFailure,
    TRequirements,
    TPageParam,
    TQueryKey
  >;
};

export type EffectInfiniteQueryDefinedInitialDataOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  DefinedInitialDataInfiniteOptions<
    TQueryFnData,
    InferQueryErrorResult<TFailure>,
    TData,
    TQueryKey,
    TPageParam
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

export type EffectInfiniteQueryOptionsInput<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> =
  | EffectInfiniteQueryUndefinedInitialDataOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TPageParam,
      TQueryKey
    >
  | EffectInfiniteQueryDefinedInitialDataOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TPageParam,
      TQueryKey
    >
  | EffectInfiniteQueryUnusedSkipTokenOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TPageParam,
      TQueryKey
    >;

// ============================================================================
// RESULT OPTIONS (plain TanStack Query options with an inferred error type)
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

export type EffectInfiniteQueryUnusedSkipTokenOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = InfiniteData<TQueryFnData>,
  TPageParam = unknown,
  TQueryKey extends QueryKey = QueryKey,
> = UnusedSkipTokenInfiniteOptions<
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
 * Mirrors the overloads of TanStack Query's `infiniteQueryOptions`, with an Effect returning
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
    options: EffectInfiniteQueryUnusedSkipTokenOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TPageParam,
      TQueryKey
    >
  ): EffectInfiniteQueryUnusedSkipTokenOptionsResult<
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

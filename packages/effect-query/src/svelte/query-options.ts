import type {
  DefinedInitialDataOptions,
  QueryFunctionContext,
  QueryKey,
  QueryKeyWithDataTag,
  SkipToken,
  UndefinedInitialDataOptions,
} from "@tanstack/svelte-query";
import type { Effect } from "effect";
import type { InferQueryErrorResult, TaggedFailure } from "../core/types";

export type EffectQueryQueryFn<
  TQueryFnData,
  TFailure,
  TRequirements,
  TPageParam = never,
  TQueryKey extends QueryKey = QueryKey,
> = (
  context: QueryFunctionContext<TQueryKey, TPageParam>
) => Effect.Effect<TQueryFnData, TFailure, TRequirements>;

// ============================================================================
// INPUT OPTIONS
// ============================================================================

export type EffectQueryUndefinedInitialDataOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  UndefinedInitialDataOptions<
    TQueryFnData,
    InferQueryErrorResult<TFailure>,
    TData,
    TQueryKey
  >,
  "queryFn"
> & {
  queryFn:
    | EffectQueryQueryFn<
        TQueryFnData,
        TFailure,
        TRequirements,
        never,
        TQueryKey
      >
    | SkipToken;
};

export type EffectQueryDefinedInitialDataOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  DefinedInitialDataOptions<
    TQueryFnData,
    InferQueryErrorResult<TFailure>,
    TData,
    TQueryKey
  >,
  "queryFn"
> & {
  queryFn:
    | EffectQueryQueryFn<
        TQueryFnData,
        TFailure,
        TRequirements,
        never,
        TQueryKey
      >
    | SkipToken;
};

// ============================================================================
// RESULT OPTIONS (plain svelte-query options with an inferred error type)
// ============================================================================

export type EffectQueryUndefinedInitialDataOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UndefinedInitialDataOptions<
  TQueryFnData,
  InferQueryErrorResult<TFailure>,
  TData,
  TQueryKey
> &
  QueryKeyWithDataTag<TQueryKey, TQueryFnData, InferQueryErrorResult<TFailure>>;

export type EffectQueryDefinedInitialDataOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = DefinedInitialDataOptions<
  TQueryFnData,
  InferQueryErrorResult<TFailure>,
  TData,
  TQueryKey
> &
  QueryKeyWithDataTag<TQueryKey, TQueryFnData, InferQueryErrorResult<TFailure>>;

/**
 * Mirrors the overloads of svelte-query's `queryOptions`, with an Effect returning `queryFn`.
 * The error type of the returned options is inferred from the Effect's failure channel.
 *
 * Like every svelte-query option, pass the result through an accessor:
 * `createQuery(() => eq.queryOptions({ ... }))`.
 */
export interface EffectQueryOptionsFunction<Input> {
  <
    TQueryFnData,
    TFailure extends TaggedFailure = never,
    TRequirements extends Input = never,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: EffectQueryDefinedInitialDataOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TQueryKey
    >
  ): EffectQueryDefinedInitialDataOptionsResult<
    TQueryFnData,
    TFailure,
    NoInfer<TData>,
    TQueryKey
  >;
  <
    TQueryFnData,
    TFailure extends TaggedFailure = never,
    TRequirements extends Input = never,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  >(
    options: EffectQueryUndefinedInitialDataOptions<
      TQueryFnData,
      TFailure,
      TRequirements,
      TData,
      TQueryKey
    >
  ): EffectQueryUndefinedInitialDataOptionsResult<
    TQueryFnData,
    TFailure,
    NoInfer<TData>,
    TQueryKey
  >;
}

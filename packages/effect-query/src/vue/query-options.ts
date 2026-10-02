import type {
  DefinedInitialQueryOptions,
  DefinedInitialQueryOptionsWithDataTag,
  QueryKey,
  QueryOptions,
  SkipToken,
  UndefinedInitialQueryOptions,
  UndefinedInitialQueryOptionsWithDataTag,
} from "@tanstack/vue-query";
import type { Effect } from "effect";
import type { Ref } from "vue";
import type { InferQueryErrorResult, TaggedFailure } from "../core/types";

/** The (unwrapped) argument TanStack Query passes to a query function. */
export type ContextOf<TFn> = TFn extends (context: infer TContext) => unknown
  ? TContext
  : never;

/** Drops the `Ref` variants of vue-query's `MaybeRef<Options>` types, keeping the plain object. */
// biome-ignore lint/suspicious/noExplicitAny: matches any Ref / ComputedRef
export type PlainOptions<TOptions> = Exclude<TOptions, Ref<any>>;

/**
 * Query function context with the query key unwrapped from refs, exactly as vue-query passes it.
 */
export type VueQueryFunctionContext<TQueryKey extends QueryKey> = ContextOf<
  QueryOptions<unknown, unknown, unknown, unknown, TQueryKey>["queryFn"]
>;

export type EffectQueryQueryFn<
  TQueryFnData,
  TFailure,
  TRequirements,
  TQueryKey extends QueryKey = QueryKey,
> = (
  context: VueQueryFunctionContext<TQueryKey>
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
  PlainOptions<
    UndefinedInitialQueryOptions<
      TQueryFnData,
      InferQueryErrorResult<TFailure>,
      TData,
      TQueryKey
    >
  >,
  "queryFn"
> & {
  queryFn:
    | EffectQueryQueryFn<TQueryFnData, TFailure, TRequirements, TQueryKey>
    | SkipToken;
};

export type EffectQueryDefinedInitialDataOptions<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TRequirements,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  PlainOptions<
    DefinedInitialQueryOptions<
      TQueryFnData,
      InferQueryErrorResult<TFailure>,
      TData,
      TQueryKey
    >
  >,
  "queryFn"
> & {
  queryFn:
    | EffectQueryQueryFn<TQueryFnData, TFailure, TRequirements, TQueryKey>
    | SkipToken;
};

// ============================================================================
// RESULT OPTIONS (plain vue-query options with an inferred error type)
// ============================================================================

export type EffectQueryUndefinedInitialDataOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UndefinedInitialQueryOptionsWithDataTag<
  TQueryFnData,
  InferQueryErrorResult<TFailure>,
  TData,
  TQueryKey
>;

export type EffectQueryDefinedInitialDataOptionsResult<
  TQueryFnData,
  TFailure extends TaggedFailure,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = DefinedInitialQueryOptionsWithDataTag<
  TQueryFnData,
  InferQueryErrorResult<TFailure>,
  TData,
  TQueryKey
>;

/**
 * Mirrors the overloads of vue-query's `queryOptions`, with an Effect returning `queryFn`.
 * The error type of the returned options is inferred from the Effect's failure channel.
 *
 * Like vue-query, `queryKey`, `enabled` and the other options may contain refs. For reactive
 * options pass a getter to `useQuery`: `useQuery(() => eq.queryOptions({ ... }))`.
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
    TData,
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
    TData,
    TQueryKey
  >;
}

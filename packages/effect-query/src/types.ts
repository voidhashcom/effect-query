import type { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type {
  EffectInfiniteQueryOptionsInput,
  EffectInfiniteQueryOptionsReturn,
} from "./infinite-query-options";
import type {
  EffectMutationOptionsReturn,
  EffectQueryMutationOptionsInput,
} from "./mutation-options";
import type {
  EffectQueryOptionsInput,
  EffectQueryOptionsReturn,
} from "./query-options";

// ============================================================================
// SHARED HELPERS
// ============================================================================

export type SkipTokenLike = symbol;

export interface InfiniteData<TData, TPageParam = unknown> {
  pageParams: TPageParam[];
  pages: TData[];
}

export type InferQueryErrorResult<TFnErrorResult extends { _tag: string }> = [
  TFnErrorResult,
] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>;

export interface EffectQuery<Input> {
  infiniteQueryOptions: <
    TQueryFnData,
    TError extends { _tag: string },
    TRequirements extends Input,
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
  ) => EffectInfiniteQueryOptionsReturn<
    EffectInfiniteQueryOptionsInput<
      TQueryFnData,
      TError,
      TRequirements,
      TData,
      TPageParam
    >
  >;
  mutationOptions: <
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements extends Input,
    TVariables,
  >(
    inputOptions: EffectQueryMutationOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TVariables
    >
  ) => EffectMutationOptionsReturn<
    EffectQueryMutationOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TVariables
    >
  >;
  queryOptions: <
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements extends Input,
  >(
    inputOptions: EffectQueryOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements
    >
  ) => EffectQueryOptionsReturn<
    EffectQueryOptionsInput<TFnResult, TFnErrorResult, TFnRequirements>
  >;
}

export type * from "./infinite-query-options";
export type * from "./mutation-options";
export type * from "./query-options";

import type { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type {
  EffectInfiniteQueryOptionsInput,
  EffectInfiniteQueryOptionsReturn,
} from "./infiniteQueryOptions";
import type {
  EffectMutationOptionsReturn,
  EffectQueryMutationOptionsInput,
} from "./mutationOptions";
import type {
  EffectQueryOptionsInput,
  EffectQueryOptionsReturn,
} from "./queryOptions";

// ============================================================================
// SHARED HELPERS
// ============================================================================

export type SkipTokenLike = symbol;

export type InfiniteData<TData, TPageParam = unknown> = {
  pages: TData[];
  pageParams: TPageParam[];
};

export type InferQueryErrorResult<TFnErrorResult extends { _tag: string }> = [
  TFnErrorResult,
] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>;

export type EffectQueryApi = {
  queryOptions: <
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
  >(
    inputOptions: EffectQueryOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements
    >
  ) => EffectQueryOptionsReturn<
    EffectQueryOptionsInput<TFnResult, TFnErrorResult, TFnRequirements>
  >;
  infiniteQueryOptions: <
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
    TFnRequirements,
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
};

export type * from "./infiniteQueryOptions";
export type * from "./mutationOptions";
export type * from "./queryOptions";

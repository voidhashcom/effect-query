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

export type EffectQuery<Input> = {
  queryOptions: <
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements extends Input,
    TInput extends EffectQueryOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements
    > = EffectQueryOptionsInput<TFnResult, TFnErrorResult, TFnRequirements>,
  >(
    inputOptions: TInput
  ) => EffectQueryOptionsReturn<TInput>;
  infiniteQueryOptions: <
    TQueryFnData,
    TError extends { _tag: string },
    TRequirements extends Input,
    TData = InfiniteData<TQueryFnData>,
    TPageParam = unknown,
    TInput extends EffectInfiniteQueryOptionsInput<
      TQueryFnData,
      TError,
      TRequirements,
      TData,
      TPageParam
    > = EffectInfiniteQueryOptionsInput<
      TQueryFnData,
      TError,
      TRequirements,
      TData,
      TPageParam
    >,
  >(
    inputOptions: TInput
  ) => EffectInfiniteQueryOptionsReturn<TInput>;
  mutationOptions: <
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements extends Input,
    TVariables,
    TInput extends EffectQueryMutationOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TVariables
    > = EffectQueryMutationOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TVariables
    >,
  >(
    inputOptions: TInput
  ) => EffectMutationOptionsReturn<TInput>;
};

export type * from "./infiniteQueryOptions";
export type * from "./mutationOptions";
export type * from "./queryOptions";

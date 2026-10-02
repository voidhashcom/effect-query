import type { EffectQueryDefect, EffectQueryFailure } from "./errors";

/**
 * Failures that can be surfaced as typed `EffectQueryFailure`s. Effect failures must be tagged
 * (e.g. `Data.TaggedError` or `Schema.TaggedError`) so they can be matched with `error.match`.
 */
export interface TaggedFailure {
  readonly _tag: string;
}

/**
 * The error type TanStack Query sees for an Effect that can fail with `TFailure`.
 *
 * Expected failures are wrapped in `EffectQueryFailure`, defects and interruptions in
 * `EffectQueryDefect`. When the Effect cannot fail, only `EffectQueryDefect` remains.
 */
export type InferQueryErrorResult<TFailure extends TaggedFailure> = [
  TFailure,
] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFailure> | EffectQueryDefect<unknown>;

/** Alias of {@link InferQueryErrorResult}. */
export type EffectQueryError<TFailure extends TaggedFailure> =
  InferQueryErrorResult<TFailure>;

/** @deprecated Use the `SkipToken` type exported by your TanStack Query adapter. */
export type SkipTokenLike = symbol;

export interface InfiniteData<TData, TPageParam = unknown> {
  pageParams: TPageParam[];
  pages: TData[];
}

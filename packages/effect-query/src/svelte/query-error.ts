import type {
  DefaultError,
  InferErrorFromTag,
  QueryClient,
  QueryKey,
} from "@tanstack/svelte-query";
import { isErrorOfQueries, toQueryKeys } from "../core/query-error";

/** Anything carrying a `queryKey`, e.g. the options returned by `eq.queryOptions`. */
export interface QueryOptionsWithKey {
  readonly queryKey: QueryKey;
}

/** One query options object, or several of them. */
export type QueryErrorSource =
  | QueryOptionsWithKey
  | readonly QueryOptionsWithKey[];

type InferSingleQueryError<TOptions> = TOptions extends {
  readonly queryKey: infer TQueryKey extends QueryKey;
}
  ? InferErrorFromTag<DefaultError, TQueryKey>
  : never;

/**
 * The error type of the given query options, read from the type tag on their `queryKey`. For an
 * array of options it is the union of their error types.
 */
export type InferQueryOptionsError<TQuery extends QueryErrorSource> =
  TQuery extends readonly (infer TOptions)[]
    ? InferSingleQueryError<TOptions>
    : InferSingleQueryError<TQuery>;

/**
 * Narrows `error` to the error type of `query` when it is the error currently stored on that query
 * (or on one of them, for an array). Use it in the `failed` snippet or `onerror` handler of a
 * `<svelte:boundary>`, e.g. around `{await queryClient.fetchQuery(userOptions(id))}`.
 */
export const isQueryError = <TQuery extends QueryErrorSource>(
  queryClient: QueryClient,
  query: TQuery,
  error: unknown
): error is InferQueryOptionsError<TQuery> =>
  isErrorOfQueries(queryClient, toQueryKeys(query), error);

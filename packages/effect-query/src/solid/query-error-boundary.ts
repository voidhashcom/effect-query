import {
  type DefaultError,
  hashKey,
  type InferErrorFromTag,
  type QueryClient,
  type QueryKey,
  useQueryClient,
} from "@tanstack/solid-query";
import {
  createComponent,
  createEffect,
  createMemo,
  ErrorBoundary,
  type JSX,
  on,
} from "solid-js";
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
 * (or on one of them, for an array). Useful inside error boundaries you don't own.
 */
export const isQueryError = <TQuery extends QueryErrorSource>(
  queryClient: QueryClient,
  query: TQuery,
  error: unknown
): error is InferQueryOptionsError<TQuery> =>
  isErrorOfQueries(queryClient, toQueryKeys(query), error);

export interface QueryErrorBoundaryFallbackProps<TError> {
  readonly error: TError;
  /** Clears the boundary and refetches the failed queries by re-rendering the children. */
  readonly reset: () => void;
}

export interface QueryErrorBoundaryProps<TQuery extends QueryErrorSource> {
  readonly children?: JSX.Element;
  readonly fallback: (
    props: QueryErrorBoundaryFallbackProps<InferQueryOptionsError<TQuery>>
  ) => JSX.Element;
  /**
   * The query (or queries) whose errors this boundary handles. Errors thrown by anything else are
   * rethrown to the next `ErrorBoundary` up the tree.
   */
  readonly query: TQuery;
}

/**
 * An `ErrorBoundary` bound to the query options it guards, so `fallback` receives the typed
 * `EffectQueryFailure<E> | EffectQueryDefect<unknown>` of that query.
 *
 * @example
 * <QueryErrorBoundary
 *   query={userOptions(id())}
 *   fallback={({ error, reset }) =>
 *     error.match({
 *       NotFound: () => <NotFoundPage />,
 *       OrElse: () => <button onClick={reset}>Retry</button>,
 *     })
 *   }
 * >
 *   <Suspense fallback={<Spinner />}>
 *     <UserProfile id={id()} />
 *   </Suspense>
 * </QueryErrorBoundary>
 */
export function QueryErrorBoundary<const TQuery extends QueryErrorSource>(
  props: QueryErrorBoundaryProps<TQuery>
): JSX.Element {
  const queryClient = useQueryClient();
  const queryKeys = createMemo(() => toQueryKeys(props.query));
  let resetCaught: (() => void) | undefined;

  // Moving to a different query (e.g. navigating from one id to another) starts over.
  createEffect(
    on(
      () => hashKey(queryKeys()),
      () => resetCaught?.(),
      { defer: true }
    )
  );

  return createComponent(ErrorBoundary, {
    get children() {
      return props.children;
    },
    fallback: (error: unknown, reset: () => void) => {
      if (!isErrorOfQueries(queryClient, queryKeys(), error)) {
        // Not ours: the fallback runs outside of this boundary, so the error reaches the next one.
        throw error;
      }
      resetCaught = () => {
        resetCaught = undefined;
        reset();
      };
      return props.fallback({
        error: error as InferQueryOptionsError<TQuery>,
        reset: resetCaught,
      });
    },
  });
}

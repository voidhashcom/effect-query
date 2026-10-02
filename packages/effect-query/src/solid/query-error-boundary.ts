import {
  type DefaultError,
  hashKey,
  type InferErrorFromTag,
  type QueryClient,
  type QueryKey,
  useQueryClient,
} from "@tanstack/solid-query";
import { Cause } from "effect";
import {
  catchError,
  createComponent,
  createEffect,
  createMemo,
  ErrorBoundary,
  type JSX,
  on,
  sharedConfig,
} from "solid-js";
import { EffectQueryDefect } from "../core/errors";
import {
  findErrorOfQueries,
  isErrorOfQueries,
  type QueryKeyOwner,
  toQueryHash,
  toQueryKeyOwners,
  toQueryKeys,
} from "../core/query-error";

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
 * A deserialized error has lost its class, so `error.match` would not exist. Prefer the typed
 * error the client's query holds, otherwise expose the server error as a defect.
 */
const reviveHydratedError = (
  queryClient: QueryClient,
  queryKeys: readonly (readonly unknown[])[],
  error: unknown
): unknown =>
  findErrorOfQueries(queryClient, queryKeys) ??
  EffectQueryDefect.fromCause(Cause.die(error));

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
  const owners = createMemo(() =>
    toQueryKeyOwners(props.query as QueryKeyOwner | readonly QueryKeyOwner[])
  );
  const queryKeys = createMemo(() =>
    owners().map((options) => options.queryKey)
  );
  let resetCaught: (() => void) | undefined;
  // Every error raised on the client reaches the boundary through its children. While hydrating,
  // `ErrorBoundary` can also start out with the error the boundary caught on the server.
  const fromChildren = new Set<unknown>();

  // Moving to a different query (e.g. navigating from one id to another) starts over.
  createEffect(
    on(
      () => toQueryHash(owners(), hashKey),
      () => resetCaught?.(),
      { defer: true }
    )
  );

  return createComponent(ErrorBoundary, {
    get children() {
      return catchError(
        () => props.children,
        (error: unknown) => {
          fromChildren.add(error);
          throw error;
        }
      );
    },
    fallback: (error: unknown, reset: () => void) => {
      const owned = isErrorOfQueries(queryClient, queryKeys(), error);
      // An error that did not come from the children is the one this boundary caught on the server,
      // deserialized while hydrating. It is never the error stored on the client's query, but the
      // server already rethrew the errors it did not own, so it is ours.
      const hydrated =
        !owned && Boolean(sharedConfig.context) && !fromChildren.has(error);
      if (!(owned || hydrated)) {
        // Not ours: the fallback runs outside of this boundary, so the error reaches the next one.
        throw error;
      }
      resetCaught = () => {
        resetCaught = undefined;
        fromChildren.clear();
        reset();
      };
      return props.fallback({
        error: (hydrated
          ? reviveHydratedError(queryClient, queryKeys(), error)
          : error) as InferQueryOptionsError<TQuery>,
        reset: resetCaught,
      });
    },
  });
}

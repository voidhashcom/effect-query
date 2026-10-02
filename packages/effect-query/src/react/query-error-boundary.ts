import {
  type DefaultError,
  hashKey,
  type InferErrorFromTag,
  type QueryClient,
  type QueryKey,
  useQueryClient,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query";
import { Component, createElement, type ReactNode } from "react";
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
 * (or on one of them, for an array). Useful for error boundaries you don't own, e.g. a router's
 * error component.
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
  readonly children?: ReactNode;
  readonly fallback: (
    props: QueryErrorBoundaryFallbackProps<InferQueryOptionsError<TQuery>>
  ) => ReactNode;
  /**
   * The query (or queries) whose errors this boundary handles. Errors thrown by anything else are
   * rethrown to the next error boundary up the tree.
   */
  readonly query: TQuery;
}

interface BoundaryProps {
  readonly children?: ReactNode;
  readonly fallback: (
    props: QueryErrorBoundaryFallbackProps<unknown>
  ) => ReactNode;
  readonly queryClient: QueryClient;
  readonly queryKeys: readonly (readonly unknown[])[];
  readonly resetErrorBoundary: () => void;
  readonly resetKey: string;
}

interface BoundaryState {
  readonly caught: { readonly error: unknown } | null;
  readonly resetKey: string;
}

// biome-ignore lint/style/useReactFunctionComponents: error boundaries can only be class components
class Boundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = {
    caught: null,
    resetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { caught: { error } };
  }

  static getDerivedStateFromProps(
    props: BoundaryProps,
    state: BoundaryState
  ): Partial<BoundaryState> | null {
    // Moving to a different query (e.g. navigating from one id to another) starts over. This has
    // to happen before `render`, which would otherwise rethrow the old error as not owned.
    if (props.resetKey === state.resetKey) {
      return null;
    }
    return { caught: null, resetKey: props.resetKey };
  }

  readonly reset = (): void => {
    this.props.resetErrorBoundary();
    this.setState({ caught: null });
  };

  override render(): ReactNode {
    const { caught } = this.state;
    if (caught === null) {
      return this.props.children;
    }
    if (
      !isErrorOfQueries(
        this.props.queryClient,
        this.props.queryKeys,
        caught.error
      )
    ) {
      // Not ours: rethrowing from render hands the error to the next boundary up the tree.
      throw caught.error;
    }
    return this.props.fallback({ error: caught.error, reset: this.reset });
  }
}

/**
 * An error boundary for `useSuspenseQuery` (or `throwOnError`) that is bound to the query options
 * it guards, so `fallback` receives the typed `EffectQueryFailure<E> | EffectQueryDefect<unknown>`
 * of that query. Retrying via `reset` goes through TanStack Query's `QueryErrorResetBoundary`.
 *
 * @example
 * <QueryErrorBoundary
 *   query={userOptions(id)}
 *   fallback={({ error, reset }) =>
 *     error.match({
 *       NotFound: () => <NotFoundPage />,
 *       OrElse: () => <button onClick={reset}>Retry</button>,
 *     })
 *   }
 * >
 *   <Suspense fallback={<Spinner />}>
 *     <UserProfile id={id} />
 *   </Suspense>
 * </QueryErrorBoundary>
 */
export function QueryErrorBoundary<const TQuery extends QueryErrorSource>(
  props: QueryErrorBoundaryProps<TQuery>
): ReactNode {
  const queryClient = useQueryClient();
  const { reset } = useQueryErrorResetBoundary();
  const queryKeys = toQueryKeys(props.query);

  return createElement(
    Boundary,
    {
      fallback: props.fallback as BoundaryProps["fallback"],
      queryClient,
      queryKeys,
      resetErrorBoundary: reset,
      resetKey: hashKey(queryKeys),
    },
    props.children
  );
}

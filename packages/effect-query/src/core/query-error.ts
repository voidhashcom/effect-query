// Framework agnostic, structural views of the TanStack Query cache. Each adapter passes its own
// `QueryClient`, so this module never imports a TanStack Query package.
interface QueryCacheLike {
  readonly find: (filters: {
    readonly exact: true;
    readonly queryKey: readonly unknown[];
  }) => { readonly state: { readonly error: unknown } } | undefined;
}

export interface QueryClientLike {
  readonly getQueryCache: () => QueryCacheLike;
}

export interface QueryKeyOwner {
  readonly queryKey: readonly unknown[];
}

/** Normalises the `query` prop of the error boundaries, which accepts one or many options. */
export const toQueryKeys = (
  query: QueryKeyOwner | readonly QueryKeyOwner[]
): readonly (readonly unknown[])[] =>
  Array.isArray(query)
    ? query.map((options: QueryKeyOwner) => options.queryKey)
    : [(query as QueryKeyOwner).queryKey];

/**
 * Whether `error` is the error currently stored on one of the given queries.
 *
 * TanStack Query throws the query's `state.error` itself into error boundaries, so comparing by
 * identity proves the error was produced by that query, and therefore has the error type carried
 * by its options. The cache lookup honours each query's own `queryKeyHashFn`.
 */
export const isErrorOfQueries = (
  queryClient: QueryClientLike,
  queryKeys: readonly (readonly unknown[])[],
  error: unknown
): boolean =>
  error !== null &&
  error !== undefined &&
  queryKeys.some(
    (queryKey) =>
      queryClient.getQueryCache().find({ exact: true, queryKey })?.state
        .error === error
  );

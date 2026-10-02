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
  readonly queryKeyHashFn?:
    | ((queryKey: readonly unknown[]) => string)
    | undefined;
}

/** Normalises the `query` prop of the error boundaries, which accepts one or many options. */
export const toQueryKeyOwners = (
  query: QueryKeyOwner | readonly QueryKeyOwner[]
): readonly QueryKeyOwner[] =>
  Array.isArray(query) ? query : [query as QueryKeyOwner];

/** The query keys of the `query` prop of the error boundaries. */
export const toQueryKeys = (
  query: QueryKeyOwner | readonly QueryKeyOwner[]
): readonly (readonly unknown[])[] =>
  toQueryKeyOwners(query).map((options) => options.queryKey);

/**
 * A stable identity for the guarded queries, used to reset a boundary when it starts guarding
 * other queries. Each query is hashed with its own `queryKeyHashFn`, like TanStack Query does, so
 * keys that the default hash cannot handle (e.g. containing a `BigInt`) work.
 */
export const toQueryHash = (
  owners: readonly QueryKeyOwner[],
  defaultHash: (queryKey: readonly unknown[]) => string
): string =>
  owners
    .map((options) => (options.queryKeyHashFn ?? defaultHash)(options.queryKey))
    .join("\n");

/** The error currently stored on the first of the given queries that has one. */
export const findErrorOfQueries = (
  queryClient: QueryClientLike,
  queryKeys: readonly (readonly unknown[])[]
): unknown => {
  for (const queryKey of queryKeys) {
    const error = queryClient.getQueryCache().find({ exact: true, queryKey })
      ?.state.error;
    if (error !== null && error !== undefined) {
      return error;
    }
  }
  return undefined;
};

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

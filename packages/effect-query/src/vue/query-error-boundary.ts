import {
  type DefaultError,
  hashKey,
  type InferErrorFromTag,
  type QueryClient,
  type QueryKey,
  useQueryClient,
} from "@tanstack/vue-query";
import {
  computed,
  defineComponent,
  type EmitsOptions,
  isRef,
  type MaybeRefOrGetter,
  onErrorCaptured,
  type SetupContext,
  type SlotsType,
  shallowRef,
  type VNodeChild,
  watch,
} from "vue";
import {
  isErrorOfQueries,
  type QueryKeyOwner,
  toQueryKeys,
} from "../core/query-error";

/** Anything carrying a `queryKey`, e.g. the options returned by `eq.queryOptions`. */
export interface QueryOptionsWithKey {
  readonly queryKey: MaybeRefOrGetter<QueryKey>;
}

/** One query options object, or several of them. */
export type QueryErrorSource =
  | QueryOptionsWithKey
  | readonly QueryOptionsWithKey[];

// vue-query tags every variant of `MaybeRefOrGetter<TQueryKey>`, the plain key carries the error.
type InferSingleQueryError<TOptions> = TOptions extends {
  readonly queryKey: infer TQueryKey;
}
  ? InferErrorFromTag<DefaultError, Extract<TQueryKey, QueryKey>>
  : never;

/**
 * The error type of the given query options, read from the type tag on their `queryKey`. For an
 * array of options it is the union of their error types.
 */
export type InferQueryOptionsError<TQuery extends QueryErrorSource> =
  TQuery extends readonly (infer TOptions)[]
    ? InferSingleQueryError<TOptions>
    : InferSingleQueryError<TQuery>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Object.prototype.toString.call(value) === "[object Object]";

/** Resolves refs and getters anywhere in a query key, like vue-query does before hashing it. */
const unwrapQueryKey = (value: unknown): unknown => {
  if (typeof value === "function") {
    return unwrapQueryKey(value());
  }
  if (isRef(value)) {
    return unwrapQueryKey(value.value);
  }
  if (Array.isArray(value)) {
    return value.map(unwrapQueryKey);
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, unwrapQueryKey(entry)])
    );
  }
  return value;
};

const resolveQueryKeys = (
  query: QueryErrorSource
): readonly (readonly unknown[])[] =>
  toQueryKeys(query as QueryKeyOwner | readonly QueryKeyOwner[]).map(
    (queryKey) => unwrapQueryKey(queryKey) as readonly unknown[]
  );

/**
 * Narrows `error` to the error type of `query` when it is the error currently stored on that query
 * (or on one of them, for an array). Useful inside `onErrorCaptured` or `app.config.errorHandler`.
 */
export const isQueryError = <TQuery extends QueryErrorSource>(
  queryClient: QueryClient,
  query: TQuery,
  error: unknown
): error is InferQueryOptionsError<TQuery> =>
  isErrorOfQueries(queryClient, resolveQueryKeys(query), error);

export interface QueryErrorBoundaryFallbackProps<TError> {
  readonly error: TError;
  /** Clears the boundary and refetches the failed queries by re-rendering the default slot. */
  readonly reset: () => void;
}

export interface QueryErrorBoundaryProps<TQuery extends QueryErrorSource> {
  /**
   * The query (or queries) whose errors this boundary handles. Errors thrown by anything else keep
   * propagating to the parent components.
   */
  readonly query: TQuery;
}

// biome-ignore lint/style/useConsistentTypeDefinitions: `SlotsType` needs the implicit index signature of a type alias
export type QueryErrorBoundarySlots<TQuery extends QueryErrorSource> = {
  default?: () => VNodeChild;
  fallback: (
    props: QueryErrorBoundaryFallbackProps<InferQueryOptionsError<TQuery>>
  ) => VNodeChild;
};

/**
 * An error boundary bound to the query options it guards, so the `fallback` slot receives the typed
 * `EffectQueryFailure<E> | EffectQueryDefect<unknown>` of that query. It catches the errors of
 * `await query.suspense()` in an async `setup` and of queries using `throwOnError`.
 *
 * @example
 * <QueryErrorBoundary :query="userOptions(id)">
 *   <Suspense><UserProfile :id="id" /></Suspense>
 *   <template #fallback="{ error, reset }">
 *     <p>{{ error.match({ NotFound: () => "Not found", OrElse: () => "Failed" }) }}</p>
 *     <button @click="reset">Retry</button>
 *   </template>
 * </QueryErrorBoundary>
 */
export const QueryErrorBoundary = defineComponent(
  <const TQuery extends QueryErrorSource>(
    props: QueryErrorBoundaryProps<TQuery>,
    {
      slots,
    }: SetupContext<EmitsOptions, SlotsType<QueryErrorBoundarySlots<TQuery>>>
  ) => {
    const queryClient = useQueryClient();
    const queryKeys = computed(() => resolveQueryKeys(props.query));
    const caught = shallowRef<{ readonly error: unknown } | null>(null);

    const reset = (): void => {
      caught.value = null;
    };

    // Moving to a different query (e.g. navigating from one id to another) starts over.
    watch(() => hashKey(queryKeys.value), reset);

    onErrorCaptured((error) => {
      if (!isErrorOfQueries(queryClient, queryKeys.value, error)) {
        // Not ours: let it keep propagating.
        return;
      }
      caught.value = { error };
      return false;
    });

    return () => {
      const current = caught.value;
      if (current === null) {
        return slots.default?.();
      }
      return slots.fallback({
        error: current.error as InferQueryOptionsError<TQuery>,
        reset,
      });
    };
  },
  { name: "QueryErrorBoundary", props: ["query"] }
);

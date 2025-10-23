import {
  type MutationFunction,
  mutationOptions,
  type QueryFunction,
  type QueryFunctionContext,
  queryOptions,
  type skipToken,
  type UseMutationOptions,
  type UseQueryOptions,
} from "@tanstack/react-query";
import {
  Cause,
  Effect,
  Exit,
  type Layer,
  ManagedRuntime,
  type Scope,
} from "effect";
import { EffectQueryError } from "./errors";

export function createEffectQuery<Input>(
  layer: Layer.Layer<Input, never, never>
) {
  type RuntimeContext = Input | Scope.Scope;

  type EffectfulMutationFunction<
    TData,
    E,
    TVariables,
    R extends RuntimeContext,
  > = (variables: TVariables) => Effect.Effect<TData, E, R>;

  type EffectfulMutationOptions<
    TData,
    E,
    TVariables,
    R extends RuntimeContext,
  > = Omit<
    UseMutationOptions<TData, Error, TVariables>,
    "mutationKey" | "mutationFn"
  > & {
    mutationKey: string;
    mutationFn:
      | EffectfulMutationFunction<TData, E, TVariables, R>
      | typeof skipToken;
  };

  type EffectfulQueryFunction<
    TData,
    E,
    R,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  > = (
    context: QueryFunctionContext<TQueryKey, TPageParam>
  ) => Effect.Effect<TData, E, R>;

  type EffectfulQueryOptions<
    TData,
    TError,
    R,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = never,
  > = Omit<
    UseQueryOptions<TData, TError, TData, TQueryKey>,
    "queryKey" | "queryFn"
  > & {
    queryKey: TQueryKey;
    queryFn:
      | EffectfulQueryFunction<TData, TError, R, TQueryKey, TPageParam>
      | typeof skipToken;
  };

  const runtime = ManagedRuntime.make(layer);
  const runner =
    <A, E, R extends RuntimeContext>(
      span: string,
      options: { signal?: AbortSignal } = {}
    ) =>
    (effect: Effect.Effect<A, E, R>): Promise<Exit.Exit<A, E>> =>
      runtime.runPromiseExit(
        effect.pipe(
          Effect.withSpan(span),
          Effect.scoped,
          Effect.tapErrorCause(Effect.logError)
        ),
        {
          signal: options.signal,
        }
      );

  return {
    queryOptions: <
      TData,
      E,
      R extends RuntimeContext,
      TQueryKey extends QueryKey = QueryKey,
    >(
      options: EffectfulQueryOptions<TData, E, R, TQueryKey>
    ) => {
      const [spanName] = options.queryKey;

      const queryFn: QueryFunction<TData, TQueryKey> = async (
        context: QueryFunctionContext<TQueryKey>
      ) => {
        const effect = (
          options.queryFn as EffectfulQueryFunction<TData, E, R, TQueryKey>
        )(context);
        const result = await effect.pipe(
          runner(spanName, { signal: context.signal })
        );
        return Exit.match(result, {
          onSuccess: (value) => value,
          onFailure: (cause) => {
            throw new EffectQueryError(Cause.pretty(cause), cause);
          },
        });
      };

      return queryOptions({
        ...options,
        queryFn,
      }) as UseQueryOptions<
        TData,
        E extends never ? never : EffectQueryError<Cause.Cause<E>>,
        TData,
        TQueryKey
      >;
    },
    mutationOptions: <TData, E, TVariables, R extends RuntimeContext>(
      options: EffectfulMutationOptions<TData, E, TVariables, R>
    ) => {
      const spanName = options.mutationKey;
      const mutationFn: MutationFunction<TData, TVariables> = async (
        variables: TVariables
      ) => {
        const effect = (
          options.mutationFn as EffectfulMutationFunction<
            TData,
            E,
            TVariables,
            R
          >
        )(variables);
        const result = await effect.pipe(runner(spanName));
        return Exit.match(result, {
          onSuccess: (value) => value,
          onFailure: (cause) => {
            throw new EffectQueryError(Cause.pretty(cause), cause);
          },
        });
      };

      return mutationOptions({
        ...options,
        mutationFn,
      }) as UseMutationOptions<
        TData,
        E extends never ? never : EffectQueryError<Cause.Cause<E>>,
        TVariables
      >;
    },
  };
}

type QueryKey = readonly [string, string, Record<string, unknown>?];

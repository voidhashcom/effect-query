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
import { Cause, Effect, Exit, Layer, ManagedRuntime } from "effect";
import { EffectQueryError } from "./errors";

// biome-ignore lint/suspicious/noExplicitAny: Generic type for layer
export function createEffectQuery<TLayer extends Layer.Layer<any, any, never>>(
	layer: TLayer,
) {
	const layerWithScope = layer.pipe(Layer.provide(Layer.scope));
	type TManagedRuntime = ManagedRuntime.ManagedRuntime<
		Layer.Layer.Success<typeof layerWithScope>,
		never
	>;
	type RuntimeContext = ManagedRuntime.ManagedRuntime.Context<TManagedRuntime>;

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
		R extends RuntimeContext,
		TQueryKey extends QueryKey = QueryKey,
		TPageParam = never,
	> = (
		context: QueryFunctionContext<TQueryKey, TPageParam>,
	) => Effect.Effect<TData, E, R>;

	type EffectfulQueryOptions<
		TData,
		TError,
		R extends RuntimeContext,
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
		<A, E, R extends RuntimeContext>(span: string) =>
		(effect: Effect.Effect<A, E, R>): Promise<Exit.Exit<A, E>> =>
			effect.pipe(
				Effect.withSpan(span),
				Effect.scoped,
				Effect.tapErrorCause(Effect.logError),
				runtime.runPromiseExit,
			);

	return {
		queryOptions: <
			TData,
			E,
			R extends RuntimeContext = RuntimeContext,
			TQueryKey extends QueryKey = QueryKey,
		>(
			options: EffectfulQueryOptions<TData, E, R, TQueryKey>,
		): UseQueryOptions<
			TData,
			EffectQueryError<Cause.Cause<E>>,
			TData,
			TQueryKey
		> => {
			const [spanName] = options.queryKey;

			const queryFn: QueryFunction<TData, TQueryKey> = async (
				context: QueryFunctionContext<TQueryKey>,
			) => {
				const effect = (
					options.queryFn as EffectfulQueryFunction<TData, E, R, TQueryKey>
				)(context);
				const result = await effect.pipe(runner(spanName));
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
				EffectQueryError<Cause.Cause<E>>,
				TData,
				TQueryKey
			>;
		},
		mutationOptions: <TData, E, TVariables, R extends RuntimeContext>(
			options: EffectfulMutationOptions<TData, E, TVariables, R>,
		) => {
			const spanName = options.mutationKey;
			const mutationFn: MutationFunction<TData, TVariables> = async (
				variables: TVariables,
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
				EffectQueryError<Cause.Cause<E>>,
				TVariables
			>;
		},
	};
}

type QueryKey = readonly [string, string, Record<string, unknown>?];

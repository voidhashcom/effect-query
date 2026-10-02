import type {
  CreateMutationOptions,
  MutationFunction,
  MutationFunctionContext,
  MutationKey,
} from "@tanstack/svelte-query";
import type { Effect } from "effect";
import type { InferQueryErrorResult, TaggedFailure } from "../core/types";

export type EffectfulMutationFunction<
  TData,
  TFailure,
  TRequirements,
  TVariables,
> = (
  variables: TVariables,
  context: MutationFunctionContext
) => Effect.Effect<TData, TFailure, TRequirements>;

export type EffectQueryMutationOptionsInput<
  TData,
  TFailure extends TaggedFailure,
  TRequirements,
  TVariables = void,
  TOnMutateResult = unknown,
> = Omit<
  CreateMutationOptions<
    TData,
    InferQueryErrorResult<TFailure>,
    TVariables,
    TOnMutateResult
  >,
  "mutationFn"
> & {
  mutationFn: EffectfulMutationFunction<
    TData,
    TFailure,
    TRequirements,
    TVariables
  >;
};

export type EffectQueryMutationOptionsResult<
  TData,
  TFailure extends TaggedFailure,
  TVariables = void,
  TOnMutateResult = unknown,
> = CreateMutationOptions<
  TData,
  InferQueryErrorResult<TFailure>,
  TVariables,
  TOnMutateResult
> & {
  mutationFn: MutationFunction<TData, TVariables>;
};

/**
 * Mirrors the overloads of svelte-query's `mutationOptions`, with an Effect returning
 * `mutationFn`. The error type of the returned options is inferred from the Effect's failure channel.
 */
export interface EffectMutationOptionsFunction<Input> {
  <
    TData,
    TFailure extends TaggedFailure = never,
    TRequirements extends Input = never,
    TVariables = void,
    TOnMutateResult = unknown,
  >(
    options: EffectQueryMutationOptionsInput<
      TData,
      TFailure,
      TRequirements,
      TVariables,
      TOnMutateResult
    > & { mutationKey: MutationKey }
  ): EffectQueryMutationOptionsResult<
    TData,
    TFailure,
    TVariables,
    TOnMutateResult
  > & { mutationKey: MutationKey };
  <
    TData,
    TFailure extends TaggedFailure = never,
    TRequirements extends Input = never,
    TVariables = void,
    TOnMutateResult = unknown,
  >(
    options: EffectQueryMutationOptionsInput<
      TData,
      TFailure,
      TRequirements,
      TVariables,
      TOnMutateResult
    >
  ): EffectQueryMutationOptionsResult<
    TData,
    TFailure,
    TVariables,
    TOnMutateResult
  >;
}

import {
  type MutationFunction,
  mutationOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { Cause, type Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";

type InferMutationErrorResult<TFnErrorResult extends { _tag: string }> = [
  TFnErrorResult,
] extends [never]
  ? EffectQueryDefect<unknown>
  : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>;

type EffectfulMutationFunction<
  TFnResult,
  TFnErrorResult,
  TFnRequirements,
  TVariables,
> = (
  variables: TVariables
) => Effect.Effect<TFnResult, TFnErrorResult, TFnRequirements>;

export type EffectQueryMutationOptionsInput<
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TFnRequirements,
  TVariables,
> = Omit<
  UseMutationOptions<TFnResult, TFnErrorResult, TVariables>,
  "mutationFn"
> & {
  mutationFn: EffectfulMutationFunction<
    TFnResult,
    TFnErrorResult,
    TFnRequirements,
    TVariables
  >;
};

export type EffectQueryMutationOptionsResult<
  TFnResult,
  TFnErrorResult extends { _tag: string },
  TVariables,
> = Omit<
  EffectQueryMutationOptionsInput<
    TFnResult,
    InferMutationErrorResult<TFnErrorResult>,
    never,
    TVariables
  >,
  "mutationFn"
> & {
  mutationFn: MutationFunction<TFnResult, TVariables>;
};

export function createEffectMutationOptions<Input>(
  runner: EffectQueryRunner<ManagedRuntime<Input, never>>
) {
  function effectMutationOptions<
    TFnResult,
    TFnErrorResult extends { _tag: string },
    TFnRequirements,
    TVariables,
  >(
    inputOptions: EffectQueryMutationOptionsInput<
      TFnResult,
      TFnErrorResult,
      TFnRequirements,
      TVariables
    >
  ): EffectQueryMutationOptionsResult<TFnResult, TFnErrorResult, TVariables> {
    const spanName = inputOptions.mutationKey?.[0] ?? "effect-query-mutation";
    const mutationFn: MutationFunction<TFnResult, TVariables> = async (
      variables: TVariables
    ) => {
      const effect = inputOptions.mutationFn(variables);
      const result = await runner.run(
        effect,
        typeof spanName === "string" ? spanName : "effect-query-mutation"
      );
      return Exit.match(result, {
        onSuccess: (value) => value,
        onFailure: (cause) => {
          if (cause._tag === "Fail") {
            const failure = cause.error;
            throw new EffectQueryFailure(Cause.pretty(cause), failure, cause);
          }
          throw new EffectQueryDefect(Cause.pretty(cause), cause);
        },
      });
    };

    // The as UseMutationOptions is a workaround to set the correct error type. React Query has no way to infer the error type from the Effect.
    return mutationOptions({
      ...inputOptions,
      mutationFn,
    }) as unknown as EffectQueryMutationOptionsResult<
      TFnResult,
      TFnErrorResult,
      TVariables
    >;
  }

  return effectMutationOptions;
}

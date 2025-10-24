import {
  type MutationFunction,
  mutationOptions,
  type skipToken,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { Cause, type Effect, Exit } from "effect";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";

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
  TFnErrorResult,
  TFnRequirements,
  TVariables,
> = Omit<
  UseMutationOptions<TFnResult, TFnErrorResult, TVariables>,
  "mutationKey" | "mutationFn"
> & {
  mutationKey: string;
  mutationFn:
    | EffectfulMutationFunction<
        TFnResult,
        TFnErrorResult,
        TFnRequirements,
        TVariables
      >
    | typeof skipToken;
};

/**
 * @internal
 */
export function effectQueryMutationOptions<
  TRuntimeInput,
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
  >,
  context: {
    runner: EffectQueryRunner<TRuntimeInput>;
  }
) {
  const spanName = inputOptions.mutationKey;
  const mutationFn: MutationFunction<TFnResult, TVariables> = async (
    variables: TVariables
  ) => {
    const effect = (
      inputOptions.mutationFn as EffectfulMutationFunction<
        TFnResult,
        TFnErrorResult,
        TFnRequirements,
        TVariables
      >
    )(variables);
    const result = await context.runner.run(effect, spanName);
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

  return mutationOptions({
    ...inputOptions,
    mutationFn,
  }) as UseMutationOptions<
    TFnResult,
    [TFnErrorResult] extends [never]
      ? never
      : EffectQueryFailure<TFnErrorResult> | EffectQueryDefect<unknown>,
    TVariables
  >;
}

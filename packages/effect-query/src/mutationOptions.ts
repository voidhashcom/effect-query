import {
  type MutationFunction,
  mutationOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { Cause, type Effect, Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";
import { EffectQueryDefect, EffectQueryFailure } from "./errors";
import type { EffectQueryRunner } from "./runner";
import type { InferQueryErrorResult } from "./types";

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
    InferQueryErrorResult<TFnErrorResult>,
    never,
    TVariables
  >,
  "mutationFn"
> & {
  mutationFn: MutationFunction<TFnResult, TVariables>;
};

export type EffectMutationOptionsReturn<TInput> =
  TInput extends EffectQueryMutationOptionsInput<
    infer R,
    infer E extends { _tag: string },
    infer _Req,
    infer V
  >
    ? EffectQueryMutationOptionsResult<R, E, V>
    : never;

export function createEffectMutationOptions<Input>(
  runner: EffectQueryRunner<ManagedRuntime<Input, never>>
) {
  function effectMutationOptions<
    TFnResult,
    TError extends { _tag: string },
    TRequirements,
    TVariables,
  >(
    inputOptions: EffectQueryMutationOptionsInput<
      TFnResult,
      TError,
      TRequirements,
      TVariables
    >
  ): EffectMutationOptionsReturn<
    EffectQueryMutationOptionsInput<
      TFnResult,
      TError,
      TRequirements,
      TVariables
    >
  > {
    const spanName = inputOptions.mutationKey?.[0] ?? "effect-query-mutation";
    const mutationFn: EffectMutationOptionsReturn<
      EffectQueryMutationOptionsInput<
        TFnResult,
        TError,
        TRequirements,
        TVariables
      >
    >["mutationFn"] = async (variables) => {
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

    return mutationOptions({
      ...inputOptions,
      mutationFn,
    }) as unknown as EffectMutationOptionsReturn<
      EffectQueryMutationOptionsInput<
        TFnResult,
        TError,
        TRequirements,
        TVariables
      >
    >;
  }

  return effectMutationOptions;
}

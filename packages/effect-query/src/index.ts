import { type Layer, ManagedRuntime } from "effect";
import {
  type EffectInfiniteQueryOptionsInput,
  effectInfiniteQueryOptions,
} from "./infiniteQueryOptions";
import {
  type EffectQueryMutationOptionsInput,
  effectQueryMutationOptions,
} from "./mutationOptions";
import {
  type EffectQueryOptionsInput,
  effectQueryQueryOptions,
} from "./queryOptions";
import { EffectQueryRunner } from "./runner";

export function createEffectQuery<Input>(
  layer: Layer.Layer<Input, never, never>
) {
  const runtime = ManagedRuntime.make(layer);
  const runner = new EffectQueryRunner(runtime);

  return {
    queryOptions: <
      TFnResult,
      TFnErrorResult extends { _tag: string },
      TFnRequirements,
    >(
      options: EffectQueryOptionsInput<
        TFnResult,
        TFnErrorResult,
        TFnRequirements
      >
    ) =>
      effectQueryQueryOptions<
        typeof runtime,
        TFnResult,
        TFnErrorResult,
        TFnRequirements
      >(
        {
          queryKey: options.queryKey,
          queryFn: options.queryFn,
        },
        {
          runner,
        }
      ),
    infiniteQueryOptions: <
      TFnResult,
      TFnErrorResult extends { _tag: string },
      TFnRequirements,
    >(
      options: EffectInfiniteQueryOptionsInput<
        TFnResult,
        TFnErrorResult,
        TFnRequirements
      >
    ) =>
      effectInfiniteQueryOptions<
        typeof runtime,
        TFnResult,
        TFnErrorResult,
        TFnRequirements
      >(options, { runner }),
    mutationOptions: <
      TFnResult,
      TFnErrorResult extends { _tag: string },
      TFnRequirements,
      TVariables,
    >(
      options: EffectQueryMutationOptionsInput<
        TFnResult,
        TFnErrorResult,
        TFnRequirements,
        TVariables
      >
    ) =>
      effectQueryMutationOptions<
        typeof runtime,
        TFnResult,
        TFnErrorResult,
        TFnRequirements,
        TVariables
      >(options, { runner }),
  };
}

import { type Layer, ManagedRuntime } from "effect";
import { createEffectInfiniteQueryOptions } from "./infiniteQueryOptions";
import { createEffectMutationOptions } from "./mutationOptions";
import { createEffectQueryQueryOptions } from "./queryOptions";
import { EffectQueryRunner } from "./runner";
import type { EffectQuery } from "./types";

export function createEffectQuery<Input>(
  layer: Layer.Layer<Input, never, never>
): EffectQuery<Input> {
  const runtime = ManagedRuntime.make(layer);
  return createEffectQueryFromManagedRuntime(runtime);
}

export function createEffectQueryFromManagedRuntime<Input>(
  runtime: ManagedRuntime.ManagedRuntime<Input, never>
): EffectQuery<Input> {
  const runner = new EffectQueryRunner(runtime);

  return {
    queryOptions: createEffectQueryQueryOptions(runner),
    infiniteQueryOptions: createEffectInfiniteQueryOptions(runner),
    mutationOptions: createEffectMutationOptions(runner),
  } as EffectQuery<Input>;
}

export type * from "./types";

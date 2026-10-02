import { type Layer, ManagedRuntime } from "effect";
import { createEffectInfiniteQueryOptions } from "./infinite-query-options";
import { createEffectMutationOptions } from "./mutation-options";
import { createEffectQueryQueryOptions } from "./query-options";
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
    infiniteQueryOptions: createEffectInfiniteQueryOptions(runner),
    mutationOptions: createEffectMutationOptions(runner),
    queryOptions: createEffectQueryQueryOptions(runner),
  };
}

export type * from "./types";

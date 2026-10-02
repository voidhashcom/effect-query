import type { Layer, ManagedRuntime } from "effect";
import {
  makeOptionFactories,
  runnerFromLayer,
  runnerFromManagedRuntime,
} from "../core/options";
import type { EffectQuery } from "./types";

/** Creates Effect aware option factories for `@tanstack/vue-query` from a `Layer`. */
export function createEffectQuery<Input>(
  layer: Layer.Layer<Input, never, never>
): EffectQuery<Input> {
  return makeOptionFactories(runnerFromLayer(layer)) as EffectQuery<Input>;
}

/** Creates Effect aware option factories for `@tanstack/vue-query` from a `ManagedRuntime`. */
export function createEffectQueryFromManagedRuntime<Input>(
  runtime: ManagedRuntime.ManagedRuntime<Input, never>
): EffectQuery<Input> {
  return makeOptionFactories(
    runnerFromManagedRuntime(runtime)
  ) as EffectQuery<Input>;
}

// biome-ignore lint/performance/noBarrelFile: package entry point
export { EffectQueryDefect, EffectQueryFailure } from "../core/errors";
export type * from "./types";

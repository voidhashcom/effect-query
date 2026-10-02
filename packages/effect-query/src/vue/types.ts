import type { EffectInfiniteQueryOptionsFunction } from "./infinite-query-options";
import type { EffectMutationOptionsFunction } from "./mutation-options";
import type { EffectQueryOptionsFunction } from "./query-options";

export interface EffectQuery<Input> {
  infiniteQueryOptions: EffectInfiniteQueryOptionsFunction<Input>;
  mutationOptions: EffectMutationOptionsFunction<Input>;
  queryOptions: EffectQueryOptionsFunction<Input>;
}

export type * from "../core/types";
export type * from "./infinite-query-options";
export type * from "./mutation-options";
export type * from "./query-options";

export type EffectQueryQueryKey = readonly [
  string,
  string,
  Record<string, unknown>?,
];

export type Accessor<T> = () => T;

import { Cause } from "effect";

const EffectQueryFailureTag = "EffectQueryFailure" as const;
const EffectQueryDefectTag = "EffectQueryDefect" as const;

type EffectQueryErrorMatcher<
  TFailure extends { _tag: string } | never = never,
  TReturn = unknown,
> = {
  OrElse: (cause: Cause.Cause<unknown>) => TReturn;
} & ([TFailure] extends [never]
  ? Record<never, never>
  : TFailure extends { _tag: string }
    ? {
        [K in TFailure["_tag"]]?: (
          failure: Extract<TFailure, { _tag: K }>
        ) => TReturn;
      }
    : Record<never, never>);

/** A short, single line description of a failure or defect, safe to show in a UI or log line. */
const describe = (value: unknown): string => {
  if (value instanceof Error) {
    return value.message === ""
      ? value.name
      : `${value.name}: ${value.message}`;
  }
  if (typeof value === "object" && value !== null) {
    if ("message" in value && typeof value.message === "string") {
      return value.message;
    }
    if ("_tag" in value && typeof value._tag === "string") {
      return value._tag;
    }
  }
  return String(value);
};

/**
 * The error TanStack Query sees when the Effect failed with an expected, typed failure.
 *
 * `failure` is the first failure of the Effect, `failureCause` the full `Cause`. `cause` (the
 * standard `Error` property) is set to `failure`, so devtools show it as the underlying error.
 */
export class EffectQueryFailure<
  TFailure extends { _tag: string } | never = never,
> extends Error {
  readonly _tag: typeof EffectQueryFailureTag;
  override readonly name = EffectQueryFailureTag;
  readonly failure: TFailure;
  readonly failureCause: Cause.Cause<TFailure>;
  constructor(
    message: string,
    failure: TFailure,
    cause: Cause.Cause<TFailure>
  ) {
    super(message, { cause: failure });
    this._tag = EffectQueryFailureTag;
    this.failure = failure;
    this.failureCause = cause;
  }

  static fromCause<F extends { _tag: string }>(
    failure: F,
    cause: Cause.Cause<F>
  ): EffectQueryFailure<F> {
    return new EffectQueryFailure(describe(failure), failure, cause);
  }

  match<TReturn>(
    matcher: EffectQueryErrorMatcher<
      TFailure extends { _tag: string } ? TFailure : never,
      TReturn
    >
  ): TReturn {
    if (
      typeof this.failure === "object" &&
      // biome-ignore lint/suspicious/noUnnecessaryConditions: runtime guard, failures are not guaranteed to match their static type
      this.failure !== null &&
      "_tag" in this.failure
    ) {
      const tag = this.failure._tag;
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic tag matching requires any
      const handler = (matcher as any)[tag];
      if (typeof handler === "function") {
        return handler(this.failure);
      }
    }
    return matcher.OrElse(this.failureCause);
  }
}

/**
 * The error TanStack Query sees when the Effect died (a defect) or was interrupted.
 *
 * `defectCause` is the `Cause` the Effect ended with. `defect` is the squashed defect, i.e. the
 * value passed to `Effect.die` or the exception thrown, which is also the standard `cause`.
 */
export class EffectQueryDefect<TDefect = unknown> extends Error {
  readonly _tag: typeof EffectQueryDefectTag;
  override readonly name = EffectQueryDefectTag;
  readonly defect: unknown;
  readonly defectCause: Cause.Cause<TDefect>;
  constructor(message: string, cause: Cause.Cause<TDefect>) {
    const defect = Cause.squash(cause);
    super(message, { cause: defect });
    this._tag = EffectQueryDefectTag;
    this.defect = defect;
    this.defectCause = cause;
  }

  static fromCause<D>(cause: Cause.Cause<D>): EffectQueryDefect<D> {
    const message = Cause.hasInterruptsOnly(cause)
      ? "The Effect was interrupted"
      : describe(Cause.squash(cause));
    return new EffectQueryDefect(message, cause);
  }

  /** Whether the Effect was interrupted (e.g. the query was cancelled) rather than dying. */
  get interrupted(): boolean {
    return Cause.hasInterruptsOnly(this.defectCause);
  }

  match<TReturn>(
    matcher: EffectQueryErrorMatcher<never, TReturn> & Record<string, unknown>
  ): TReturn {
    return matcher.OrElse(this.defectCause);
  }
}

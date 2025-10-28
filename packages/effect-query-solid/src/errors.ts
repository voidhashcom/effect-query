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

export class EffectQueryFailure<
  TFailure extends { _tag: string } | never = never,
> extends Error {
  readonly _tag: typeof EffectQueryFailureTag;
  readonly failure: TFailure;
  readonly failureCause: Cause.Cause<TFailure>;
  constructor(
    message: string,
    failure: TFailure,
    cause: Cause.Cause<TFailure>
  ) {
    super(message);
    this._tag = EffectQueryFailureTag;
    this.failure = failure;
    this.failureCause = cause;
  }

  match<TReturn>(
    matcher: EffectQueryErrorMatcher<
      TFailure extends { _tag: string } ? TFailure : never,
      TReturn
    >
  ): TReturn {
    if (
      this.failure &&
      typeof this.failure === "object" &&
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

export class EffectQueryDefect<TDefect> extends Error {
  readonly _tag: typeof EffectQueryDefectTag;
  readonly defectCause: Cause.Cause<TDefect>;
  constructor(message: string, defect: TDefect) {
    super(message);
    this._tag = EffectQueryDefectTag;
    this.defectCause = Cause.die(defect);
  }

  match<TReturn>(
    matcher: EffectQueryErrorMatcher<never, TReturn> & Record<string, unknown>
  ): TReturn {
    return matcher.OrElse(this.defectCause);
  }
}

import { Cause, Effect, type Exit } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";

export class EffectQueryRunner<
  // biome-ignore lint/suspicious/noExplicitAny: generic
  TManagedRuntime extends ManagedRuntime<any, never>,
> {
  readonly runtime: TManagedRuntime;
  constructor(runtime: TManagedRuntime) {
    this.runtime = runtime;
  }

  async run<TResult, TError, TRequirements>(
    effect: Effect.Effect<TResult, TError, TRequirements>,
    span: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<Exit.Exit<TResult, TError>> {
    const runnable = Effect.scoped(
      effect.pipe(
        Effect.withSpan(span),
        Effect.tapCause((cause) => Effect.logError(Cause.pretty(cause)))
      )
    );
    return await this.runtime.runPromiseExit<TResult, TError>(runnable, {
      signal: options.signal,
    });
  }
}

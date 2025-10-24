import { Effect, type Exit, type Scope } from "effect";
import type { ManagedRuntime } from "effect/ManagedRuntime";

export class EffectQueryRunner<TRuntimeInput> {
  readonly runtime: ManagedRuntime<TRuntimeInput, never>;
  constructor(runtime: ManagedRuntime<TRuntimeInput, never>) {
    this.runtime = runtime;
  }

  async run<TResult, TError, TRequirements>(
    effect: Effect.Effect<TResult, TError, TRequirements>,
    span: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<Exit.Exit<TResult, TError>> {
    // This is a workaround to allow the effect to run without a scope (it will be provided by the caller)
    const effectToRun = effect as Effect.Effect<
      TResult,
      TError,
      TRuntimeInput | Scope.Scope
    >;
    return await this.runtime.runPromiseExit(
      effectToRun.pipe(
        Effect.withSpan(span),
        Effect.scoped,
        Effect.tapErrorCause(Effect.logError)
      ),
      {
        signal: options.signal,
      }
    );
  }
}

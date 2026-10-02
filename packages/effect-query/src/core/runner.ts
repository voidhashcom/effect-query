import { Cause, Effect, Exit, ManagedRuntime } from "effect";
import type { Layer } from "effect/Layer";

// biome-ignore lint/suspicious/noExplicitAny: generic
type AnyManagedRuntime = ManagedRuntime.ManagedRuntime<any, never>;

export interface EffectQueryRunOptions {
  readonly signal?: AbortSignal | undefined;
}

/**
 * Runs the Effects of queries and mutations on a `ManagedRuntime`.
 *
 * A runner created from a `Layer` owns its runtime: when building the layer dies (e.g. a
 * transient network error while acquiring a resource), the failed runtime is discarded and the
 * next run builds the layer again, so TanStack Query's retries can recover. A runtime passed in
 * by the user is never replaced.
 */
export class EffectQueryRunner {
  private currentRuntime: AnyManagedRuntime;
  private readonly makeRuntime: (() => AnyManagedRuntime) | undefined;
  private disposed = false;

  constructor(
    runtime: AnyManagedRuntime,
    makeRuntime?: () => AnyManagedRuntime
  ) {
    this.currentRuntime = runtime;
    this.makeRuntime = makeRuntime;
  }

  static fromLayer<Input>(
    layer: Layer<Input, never, never>
  ): EffectQueryRunner {
    const makeRuntime = () => ManagedRuntime.make(layer);
    return new EffectQueryRunner(makeRuntime(), makeRuntime);
  }

  get runtime(): AnyManagedRuntime {
    return this.currentRuntime;
  }

  /** Disposes the runtime, running the finalizers of every scoped service of the layer. */
  dispose(): Promise<void> {
    this.disposed = true;
    return this.currentRuntime.dispose();
  }

  async run<TResult, TError, TRequirements>(
    effect: Effect.Effect<TResult, TError, TRequirements>,
    span: string,
    options: EffectQueryRunOptions = {}
  ): Promise<Exit.Exit<TResult, TError>> {
    const runtime = this.currentRuntime;
    if (runtime.cachedContext === undefined && this.makeRuntime) {
      const built = await Effect.runPromiseExit(runtime.contextEffect, {
        signal: options.signal,
      });
      if (Exit.isFailure(built)) {
        this.discardFailedRuntime(runtime, built.cause);
        return built as Exit.Exit<never, never>;
      }
    }
    // Typed failures are expected and handled through TanStack Query, interruptions are routine
    // cancellations. Only defects are logged, through the logger of the runtime.
    const runnable = Effect.scoped(
      effect.pipe(
        Effect.withSpan(span),
        Effect.tapDefect((defect) =>
          Effect.logError("effect-query: unexpected defect", defect)
        )
      )
    );
    return await runtime.runPromiseExit(runnable, { signal: options.signal });
  }

  private discardFailedRuntime(
    runtime: AnyManagedRuntime,
    cause: Cause.Cause<unknown>
  ): void {
    // An interrupted build (the query was cancelled) is still shared by concurrent runs, only a
    // build that actually died is replaced. Concurrent runs that saw the same failure only swap once.
    if (
      Cause.hasInterruptsOnly(cause) ||
      this.disposed ||
      this.currentRuntime !== runtime ||
      !this.makeRuntime
    ) {
      return;
    }
    this.currentRuntime = this.makeRuntime();
    runtime.dispose().catch(() => undefined);
  }
}

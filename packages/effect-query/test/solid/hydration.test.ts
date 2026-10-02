import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import { Data, Effect, Layer } from "effect";
import {
  createComponent,
  createRoot,
  ErrorBoundary,
  type JSX,
  sharedConfig,
} from "solid-js";
import { afterEach, describe, expect, test } from "vitest";
import {
  createEffectQuery,
  EffectQueryDefect,
  EffectQueryFailure,
  QueryErrorBoundary,
  type QueryErrorBoundaryProps,
  type QueryErrorSource,
} from "../../src/solid";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}

const eq = createEffectQuery(Layer.empty);

const userOptions = eq.queryOptions({
  queryFn: () => Effect.fail(new NotFound({ id: "1" })),
  queryKey: ["hydrated-user"],
  throwOnError: true,
});

const boundary = <const TQuery extends QueryErrorSource>(
  props: QueryErrorBoundaryProps<TQuery>
) => createComponent(QueryErrorBoundary<TQuery>, props);

const describeError = (
  error: EffectQueryFailure<NotFound> | EffectQueryDefect
) =>
  error.match({
    NotFound: (failure) => `failure:${failure.id}`,
    OrElse: () =>
      `defect:${error instanceof EffectQueryDefect ? (error.defect as Error).message : "?"}`,
  });

/** Resolves the accessors Solid components return when rendered without a DOM. */
const resolve = (value: unknown): unknown => {
  let current = value;
  while (typeof current === "function") {
    current = (current as () => unknown)();
  }
  return current;
};

/**
 * Renders `ui` the way Solid hydrates it: `sharedConfig.context` is set and `sharedConfig.load`
 * returns what the server serialized for each boundary.
 */
const hydrate = (
  queryClient: QueryClient,
  serverError: unknown,
  ui: () => JSX.Element
): unknown =>
  resolve(
    createRoot((dispose) => {
      disposers.push(dispose);
      sharedConfig.context = { count: 0, id: "", lazy: {} } as never;
      sharedConfig.load = () => serverError as never;
      try {
        return createComponent(QueryClientProvider, {
          get children() {
            return ui();
          },
          client: queryClient,
        });
      } finally {
        sharedConfig.context = undefined as never;
        sharedConfig.load = undefined;
      }
    })
  );

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
});

describe("QueryErrorBoundary hydration", () => {
  test("renders the server error as a defect when the client has no error for the query", () => {
    // What seroval hands back for the error the boundary caught on the server.
    const deserialized = new Error("NotFound");
    // `load` hands every boundary the server error, so there is no outer boundary here: an error
    // escalating from the inner one would make `hydrate` throw.
    const html = hydrate(new QueryClient(), deserialized, () =>
      boundary({
        children: "children",
        fallback: ({ error }) => describeError(error),
        query: userOptions,
      })
    );

    expect(html).toBe("defect:NotFound");
  });

  test("prefers the typed error the client's query holds", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    await queryClient.fetchQuery(userOptions).catch(() => undefined);
    expect(
      queryClient.getQueryState(userOptions.queryKey)?.error
    ).toBeInstanceOf(EffectQueryFailure);

    const html = hydrate(queryClient, new Error("NotFound"), () =>
      boundary({
        children: "children",
        fallback: ({ error }) => describeError(error),
        query: userOptions,
      })
    );

    expect(html).toBe("failure:1");
  });

  test("errors thrown by the children while hydrating still reach the next boundary", () => {
    const Thrower = (): JSX.Element => {
      throw new Error("unrelated");
    };
    const html = hydrate(new QueryClient(), undefined, () =>
      createComponent(ErrorBoundary, {
        get children() {
          return boundary({
            get children() {
              return createComponent(Thrower, {});
            },
            fallback: () => "inner",
            query: userOptions,
          });
        },
        fallback: (error: Error) => `outer:${error.message}`,
      })
    );

    expect(html).toBe("outer:unrelated");
  });
});

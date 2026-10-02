// biome-ignore-all lint/performance/noJsxPropsBind: inline callbacks keep the test components readable
import {
  QueryClient,
  QueryClientProvider,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Context, Data, Effect, Layer } from "effect";
import { Component, type ReactNode, Suspense, useState } from "react";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-react";
import {
  createEffectQuery,
  EffectQueryFailure,
  isQueryError,
  QueryErrorBoundary,
} from "../../src";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}

let attempts = 0;
let recovered = false;

class Users extends Context.Service<
  Users,
  { readonly get: (id: string) => Effect.Effect<string, NotFound> }
>()("test/BoundaryUsers") {}

const UsersLive = Layer.succeed(Users)({
  get: (id) =>
    Effect.suspend(() => {
      attempts += 1;
      return id === "missing" && !recovered
        ? Effect.fail(new NotFound({ id }))
        : Effect.succeed(`user:${id}`);
    }),
});

const eq = createEffectQuery(UsersLive);

const userOptions = (id: string) =>
  eq.queryOptions({
    queryFn: () =>
      Effect.gen(function* () {
        const users = yield* Users;
        return yield* users.get(id);
      }),
    queryKey: ["boundary-user", id],
  });

const User = ({ id }: { id: string }) => {
  const { data } = useSuspenseQuery(userOptions(id));
  return <p>{data}</p>;
};

const Thrower = (): ReactNode => {
  throw new Error("unrelated");
};

// biome-ignore lint/style/useReactFunctionComponents: error boundaries can only be class components
class Outer extends Component<{ children: ReactNode }, { error: unknown }> {
  override state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  override render() {
    return this.state.error === null ? (
      this.props.children
    ) : (
      <p>outer: {String((this.state.error as Error).message)}</p>
    );
  }
}

const renderWithClient = async (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return {
    queryClient,
    screen: await render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    ),
  };
};

describe("QueryErrorBoundary", () => {
  test("renders the typed failure of the bound query", async () => {
    recovered = false;
    const { screen } = await renderWithClient(
      <QueryErrorBoundary
        fallback={({ error }) =>
          error.match({
            NotFound: (notFound) => <p>not found: {notFound.id}</p>,
            OrElse: () => <p>other</p>,
          })
        }
        query={userOptions("missing")}
      >
        <Suspense fallback={<p>loading</p>}>
          <User id="missing" />
        </Suspense>
      </QueryErrorBoundary>
    );

    await expect
      .element(screen.getByText("not found: missing"))
      .toBeInTheDocument();
  });

  test("rethrows errors that do not belong to the bound query", async () => {
    const { screen } = await renderWithClient(
      <Outer>
        <QueryErrorBoundary
          fallback={() => <p>inner</p>}
          query={userOptions("missing")}
        >
          <Thrower />
        </QueryErrorBoundary>
      </Outer>
    );

    await expect
      .element(screen.getByText("outer: unrelated"))
      .toBeInTheDocument();
  });

  test("rethrows errors of other queries", async () => {
    recovered = false;
    const { screen } = await renderWithClient(
      <Outer>
        <QueryErrorBoundary
          fallback={() => <p>inner</p>}
          query={userOptions("someone-else")}
        >
          <Suspense fallback={<p>loading</p>}>
            <User id="missing" />
          </Suspense>
        </QueryErrorBoundary>
      </Outer>
    );

    await expect
      .element(screen.getByText("outer:", { exact: false }))
      .toBeInTheDocument();
  });

  test("accepts several queries", async () => {
    recovered = false;
    const { screen } = await renderWithClient(
      <QueryErrorBoundary
        fallback={({ error }) => (
          <p>{error instanceof EffectQueryFailure ? "failure" : "defect"}</p>
        )}
        query={[userOptions("ok"), userOptions("missing")]}
      >
        <Suspense fallback={<p>loading</p>}>
          <User id="ok" />
          <User id="missing" />
        </Suspense>
      </QueryErrorBoundary>
    );

    await expect.element(screen.getByText("failure")).toBeInTheDocument();
  });

  test("reset refetches the failed query", async () => {
    recovered = false;
    attempts = 0;
    const { screen } = await renderWithClient(
      <QueryErrorBoundary
        fallback={({ reset }) => (
          <button
            onClick={() => {
              recovered = true;
              reset();
            }}
            type="button"
          >
            retry
          </button>
        )}
        query={userOptions("missing")}
      >
        <Suspense fallback={<p>loading</p>}>
          <User id="missing" />
        </Suspense>
      </QueryErrorBoundary>
    );

    await screen.getByText("retry").click();
    await expect.element(screen.getByText("user:missing")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  test("resets when the bound query changes", async () => {
    recovered = false;
    const Switcher = () => {
      const [id, setId] = useState("missing");
      return (
        <>
          <button onClick={() => setId("Ripley")} type="button">
            switch
          </button>
          <QueryErrorBoundary
            fallback={() => <p>failed</p>}
            query={userOptions(id)}
          >
            <Suspense fallback={<p>loading</p>}>
              <User id={id} />
            </Suspense>
          </QueryErrorBoundary>
        </>
      );
    };
    const { screen } = await renderWithClient(<Switcher />);

    await expect.element(screen.getByText("failed")).toBeInTheDocument();
    await screen.getByText("switch").click();
    await expect.element(screen.getByText("user:Ripley")).toBeInTheDocument();
  });

  // While the fallback is shown the failed query has no observers. Removing, garbage collecting or
  // refetching it must not turn the error that was caught into an error of someone else.
  const renderRerenderable = async () => {
    recovered = false;
    const Rerenderable = () => {
      const [renders, setRenders] = useState(0);
      return (
        <Outer>
          <button onClick={() => setRenders(renders + 1)} type="button">
            rerender {renders}
          </button>
          <QueryErrorBoundary
            fallback={() => <p>inner fallback</p>}
            query={userOptions("missing")}
          >
            <Suspense fallback={<p>loading</p>}>
              <User id="missing" />
            </Suspense>
          </QueryErrorBoundary>
        </Outer>
      );
    };
    return await renderWithClient(<Rerenderable />);
  };

  test("keeps the fallback when the failed query is removed from the cache", async () => {
    const { queryClient, screen } = await renderRerenderable();
    await expect
      .element(screen.getByText("inner fallback"))
      .toBeInTheDocument();

    queryClient.removeQueries({ queryKey: userOptions("missing").queryKey });
    await screen.getByText("rerender 0").click();

    await expect.element(screen.getByText("rerender 1")).toBeInTheDocument();
    await expect
      .element(screen.getByText("inner fallback"))
      .toBeInTheDocument();
  });

  test("keeps the fallback when the failed query is refetched with a new error", async () => {
    const { queryClient, screen } = await renderRerenderable();
    await expect
      .element(screen.getByText("inner fallback"))
      .toBeInTheDocument();
    const options = userOptions("missing");
    const caught = queryClient.getQueryState(options.queryKey)?.error;

    await queryClient.fetchQuery(options).catch(() => undefined);
    expect(queryClient.getQueryState(options.queryKey)?.error).not.toBe(caught);
    await screen.getByText("rerender 0").click();

    await expect.element(screen.getByText("rerender 1")).toBeInTheDocument();
    await expect
      .element(screen.getByText("inner fallback"))
      .toBeInTheDocument();
  });
});

describe("isQueryError", () => {
  test("only accepts the error stored on the query", async () => {
    recovered = false;
    const queryClient = new QueryClient();
    const options = userOptions("missing");
    await queryClient.fetchQuery(options).catch(() => undefined);
    const error = queryClient.getQueryState(options.queryKey)?.error;

    expect(isQueryError(queryClient, options, error)).toBe(true);
    expect(isQueryError(queryClient, userOptions("other"), error)).toBe(false);
    expect(isQueryError(queryClient, options, new Error("nope"))).toBe(false);
  });
});

// TanStack Query's default hash cannot serialize a `BigInt`, such keys need a `queryKeyHashFn`.
const bigintHash = (key: readonly unknown[]) =>
  JSON.stringify(key, (_, value: unknown) =>
    typeof value === "bigint" ? `${value}n` : value
  );

const bigUserOptions = eq.queryOptions({
  queryFn: () => Effect.fail(new NotFound({ id: "big" })),
  queryKey: ["big-user", 1n],
  queryKeyHashFn: bigintHash,
});

const BigUser = () => {
  const { data } = useSuspenseQuery(bigUserOptions);
  return <p>{String(data)}</p>;
};

describe("QueryErrorBoundary with a custom queryKeyHashFn", () => {
  test("guards queries whose keys the default hash cannot serialize", async () => {
    const { screen } = await renderWithClient(
      <QueryErrorBoundary
        fallback={({ error }) =>
          error.match({
            NotFound: (notFound) => <p>big: {notFound.id}</p>,
            OrElse: () => <p>other</p>,
          })
        }
        query={bigUserOptions}
      >
        <Suspense fallback={<p>loading</p>}>
          <BigUser />
        </Suspense>
      </QueryErrorBoundary>
    );

    await expect.element(screen.getByText("big: big")).toBeInTheDocument();
  });
});

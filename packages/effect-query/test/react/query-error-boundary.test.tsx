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

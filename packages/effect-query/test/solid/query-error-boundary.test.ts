import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/solid-query";
import { Context, Data, Effect, Layer } from "effect";
import {
  createComponent,
  createSignal,
  ErrorBoundary,
  type JSX,
  Suspense,
} from "solid-js";
import { render } from "solid-js/web";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createEffectQuery,
  EffectQueryFailure,
  isQueryError,
  QueryErrorBoundary,
  type QueryErrorBoundaryProps,
  type QueryErrorSource,
} from "../../src/solid";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}

let attempts = 0;
let recovered = false;

class Users extends Context.Service<
  Users,
  { readonly get: (id: string) => Effect.Effect<string, NotFound> }
>()("test/SolidBoundaryUsers") {}

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
    queryKey: ["solid-boundary-user", id],
    // solid-query only hands errors to an `ErrorBoundary` when asked to.
    throwOnError: true,
  });

const User = (props: { id: string }): JSX.Element => {
  const query = useQuery(() => userOptions(props.id));
  return (() => query.data) as unknown as JSX.Element;
};

// JSX infers the generic of `QueryErrorBoundary`, `createComponent` needs it spelled out.
const boundary = <const TQuery extends QueryErrorSource>(
  props: QueryErrorBoundaryProps<TQuery>
) => createComponent(QueryErrorBoundary<TQuery>, props);

const Thrower = (): JSX.Element => {
  throw new Error("unrelated");
};

const suspended = (children: () => JSX.Element) =>
  createComponent(Suspense, {
    get children() {
      return children();
    },
    fallback: "loading",
  });

const disposers: (() => void)[] = [];
afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose();
  }
  document.body.innerHTML = "";
});

const mount = (ui: () => JSX.Element) => {
  const container = document.createElement("div");
  document.body.append(container);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  disposers.push(
    render(
      () =>
        createComponent(QueryClientProvider, {
          get children() {
            return ui();
          },
          client,
        }),
      container
    )
  );
  return container;
};

const button = (label: string, onClick: () => void): JSX.Element => {
  const element = document.createElement("button");
  element.type = "button";
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
};

describe("QueryErrorBoundary", () => {
  test("renders the typed failure of the bound query", async () => {
    recovered = false;
    const container = mount(() =>
      boundary({
        get children() {
          return suspended(() => createComponent(User, { id: "missing" }));
        },
        fallback: ({ error }) =>
          error.match({
            NotFound: (notFound) => `not found: ${notFound.id}`,
            OrElse: () => "other",
          }),
        query: userOptions("missing"),
      })
    );

    await vi.waitFor(() =>
      expect(container.textContent).toBe("not found: missing")
    );
  });

  test("rethrows errors that do not belong to the bound query", async () => {
    const container = mount(() =>
      createComponent(ErrorBoundary, {
        get children() {
          return boundary({
            get children() {
              return createComponent(Thrower, {});
            },
            fallback: () => "inner",
            query: userOptions("missing"),
          });
        },
        fallback: (error: Error) => `outer: ${error.message}`,
      })
    );

    await vi.waitFor(() =>
      expect(container.textContent).toBe("outer: unrelated")
    );
  });

  test("accepts several queries", async () => {
    recovered = false;
    const container = mount(() =>
      boundary({
        get children() {
          return suspended(() => [
            createComponent(User, { id: "ok" }),
            createComponent(User, { id: "missing" }),
          ]);
        },
        fallback: ({ error }) =>
          error instanceof EffectQueryFailure ? "failure" : "defect",
        query: [userOptions("ok"), userOptions("missing")],
      })
    );

    await vi.waitFor(() => expect(container.textContent).toBe("failure"));
  });

  test("reset refetches the failed query", async () => {
    recovered = false;
    attempts = 0;
    const container = mount(() =>
      boundary({
        get children() {
          return suspended(() => createComponent(User, { id: "missing" }));
        },
        fallback: ({ reset }) =>
          button("retry", () => {
            recovered = true;
            reset();
          }),
        query: userOptions("missing"),
      })
    );

    await vi.waitFor(() => expect(container.textContent).toBe("retry"));
    container.querySelector("button")?.click();
    await vi.waitFor(() => expect(container.textContent).toBe("user:missing"));
    expect(attempts).toBe(2);
  });

  test("resets when the bound query changes", async () => {
    recovered = false;
    const [id, setId] = createSignal("missing");
    const container = mount(() =>
      boundary({
        get children() {
          return suspended(() =>
            createComponent(User, {
              get id() {
                return id();
              },
            })
          );
        },
        fallback: () => "failed",
        get query() {
          return userOptions(id());
        },
      })
    );

    await vi.waitFor(() => expect(container.textContent).toBe("failed"));
    setId("Ripley");
    await vi.waitFor(() => expect(container.textContent).toBe("user:Ripley"));
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
  queryKey: ["solid-big-user", 1n],
  queryKeyHashFn: bigintHash,
  throwOnError: true,
});

const BigUser = (): JSX.Element => {
  const query = useQuery(() => bigUserOptions);
  return (() => String(query.data)) as unknown as JSX.Element;
};

describe("QueryErrorBoundary with a custom queryKeyHashFn", () => {
  test("guards queries whose keys the default hash cannot serialize", async () => {
    const container = mount(() =>
      boundary({
        get children() {
          return suspended(() => createComponent(BigUser, {}));
        },
        fallback: ({ error }) =>
          error.match({
            NotFound: (notFound) => `big: ${notFound.id}`,
            OrElse: () => "other",
          }),
        query: bigUserOptions,
      })
    );

    await vi.waitFor(() => expect(container.textContent).toBe("big: big"));
  });
});

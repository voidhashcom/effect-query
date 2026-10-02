// biome-ignore-all lint/correctness/useHookAtTopLevel: `useQuery` is a Vue composable called from `setup`, not a React hook
import { QueryClient, useQuery, VueQueryPlugin } from "@tanstack/vue-query";
import { Context, Data, Effect, Layer } from "effect";
import { describe, expect, test } from "vitest";
import { render } from "vitest-browser-vue";
import {
  type Component,
  defineComponent,
  h,
  onErrorCaptured,
  ref,
  type SlotsType,
  Suspense,
  type VNodeChild,
} from "vue";
import {
  createEffectQuery,
  EffectQueryFailure,
  isQueryError,
  QueryErrorBoundary,
} from "../../src/vue";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}

let attempts = 0;
let recovered = false;

class Users extends Context.Service<
  Users,
  { readonly get: (id: string) => Effect.Effect<string, NotFound> }
>()("test/VueBoundaryUsers") {}

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
    queryKey: ["vue-boundary-user", id],
  });

/**
 * Suspends with `await query.suspense()`, the vue-query way to use `<Suspense>`. It only rejects
 * with `throwOnError`, otherwise it resolves with the failed result.
 */
const User = defineComponent({
  props: { id: { required: true, type: String } },
  async setup(props) {
    const query = useQuery({ ...userOptions(props.id), throwOnError: true });
    await query.suspense();
    return () => h("p", query.data.value);
  },
});

/** Throws from a `throwOnError` query, without `<Suspense>`. */
const ThrowingUser = defineComponent({
  props: { id: { required: true, type: String } },
  setup(props) {
    const query = useQuery({ ...userOptions(props.id), throwOnError: true });
    return () => h("p", query.data.value ?? "loading");
  },
});

const Thrower = defineComponent({
  setup() {
    throw new Error("unrelated");
  },
});

const Outer = defineComponent({
  setup(_, { slots }) {
    const error = ref<Error | null>(null);
    onErrorCaptured((captured: Error) => {
      error.value = captured;
      return false;
    });
    return () =>
      error.value === null
        ? slots.default()
        : h("p", `outer: ${error.value.message}`);
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
});

const suspended = (child: () => ReturnType<typeof h>) =>
  h(Suspense, null, { default: child, fallback: () => h("p", "loading") });

const mount = (component: Component) =>
  render(component, {
    global: {
      plugins: [
        [
          VueQueryPlugin,
          {
            queryClient: new QueryClient({
              defaultOptions: { queries: { retry: false } },
            }),
          },
        ],
      ],
    },
  });

describe("QueryErrorBoundary", () => {
  test("renders the typed failure of the bound query", async () => {
    recovered = false;
    const screen = await mount({
      render: () =>
        h(
          QueryErrorBoundary,
          { query: userOptions("missing") },
          {
            default: () => suspended(() => h(User, { id: "missing" })),
            fallback: ({ error }: { error: unknown }) =>
              h(
                "p",
                error instanceof EffectQueryFailure
                  ? `not found: ${error.failure.id}`
                  : "other"
              ),
          }
        ),
    });

    await expect
      .element(screen.getByText("not found: missing"))
      .toBeInTheDocument();
  });

  test("catches throwOnError queries", async () => {
    recovered = false;
    const screen = await mount({
      render: () =>
        h(
          QueryErrorBoundary,
          { query: userOptions("missing") },
          {
            default: () => h(ThrowingUser, { id: "missing" }),
            fallback: () => h("p", "failed"),
          }
        ),
    });

    await expect.element(screen.getByText("failed")).toBeInTheDocument();
  });

  test("lets errors that do not belong to the bound query propagate", async () => {
    const screen = await mount({
      render: () =>
        h(Outer, null, {
          default: () =>
            h(
              QueryErrorBoundary,
              { query: userOptions("missing") },
              {
                default: () => h(Thrower),
                fallback: () => h("p", "inner"),
              }
            ),
        }),
    });

    await expect
      .element(screen.getByText("outer: unrelated"))
      .toBeInTheDocument();
  });

  test("accepts several queries", async () => {
    recovered = false;
    const screen = await mount({
      render: () =>
        h(
          QueryErrorBoundary,
          { query: [userOptions("ok"), userOptions("missing")] },
          {
            default: () =>
              suspended(() =>
                h("div", [h(User, { id: "ok" }), h(User, { id: "missing" })])
              ),
            fallback: () => h("p", "failed"),
          }
        ),
    });

    await expect.element(screen.getByText("failed")).toBeInTheDocument();
  });

  test("reset refetches the failed query", async () => {
    recovered = false;
    attempts = 0;
    const screen = await mount({
      render: () =>
        h(
          QueryErrorBoundary,
          { query: userOptions("missing") },
          {
            default: () => suspended(() => h(User, { id: "missing" })),
            fallback: ({ reset }: { reset: () => void }) =>
              h(
                "button",
                {
                  onClick: () => {
                    recovered = true;
                    reset();
                  },
                  type: "button",
                },
                "retry"
              ),
          }
        ),
    });

    await screen.getByText("retry").click();
    await expect.element(screen.getByText("user:missing")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });

  test("resets when the bound query changes", async () => {
    recovered = false;
    const id = ref("missing");
    const screen = await mount({
      render: () => [
        h(
          "button",
          {
            onClick: () => {
              id.value = "Ripley";
            },
            type: "button",
          },
          "switch"
        ),
        h(
          QueryErrorBoundary,
          { query: userOptions(id.value) },
          {
            default: () =>
              suspended(() => h(User, { id: id.value, key: id.value })),
            fallback: () => h("p", "failed"),
          }
        ),
      ],
    });

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

  test("resolves refs and getters in the query key", async () => {
    recovered = false;
    const queryClient = new QueryClient();
    const options = userOptions("missing");
    await queryClient.fetchQuery(options).catch(() => undefined);
    const error = queryClient.getQueryState(options.queryKey)?.error;
    const id = ref("missing");

    expect(
      isQueryError(
        queryClient,
        { queryKey: ["vue-boundary-user", id] as const },
        error
      )
    ).toBe(true);
    expect(
      isQueryError(
        queryClient,
        { queryKey: () => ["vue-boundary-user", id.value] },
        error
      )
    ).toBe(true);
  });
});

// TanStack Query's default hash cannot serialize a `BigInt`, such keys need a `queryKeyHashFn`.
const bigintHash = (key: readonly unknown[]) =>
  JSON.stringify(key, (_, value: unknown) =>
    typeof value === "bigint" ? `${value}n` : value
  );

const bigUserOptions = eq.queryOptions({
  queryFn: () => Effect.fail(new NotFound({ id: "big" })),
  queryKey: ["vue-big-user", 1n],
  queryKeyHashFn: bigintHash,
});

const BigUser = defineComponent({
  async setup() {
    const query = useQuery({ ...bigUserOptions, throwOnError: true });
    await query.suspense();
    return () => h("p", String(query.data.value));
  },
});

describe("QueryErrorBoundary with a custom queryKeyHashFn", () => {
  test("guards queries whose keys the default hash cannot serialize", async () => {
    const screen = await mount({
      render: () =>
        h(
          QueryErrorBoundary,
          { query: bigUserOptions },
          {
            default: () => suspended(() => h(BigUser)),
            fallback: ({ error }: { error: unknown }) =>
              h(
                "p",
                error instanceof EffectQueryFailure
                  ? `big: ${error.failure.id}`
                  : "other"
              ),
          }
        ),
    });

    await expect.element(screen.getByText("big: big")).toBeInTheDocument();
  });
});

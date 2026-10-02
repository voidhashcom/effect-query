import {
  type InfiniteData,
  QueryClient,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
} from "@tanstack/vue-query";
import { Context, Data, Effect, type Layer } from "effect";
import { describe, expectTypeOf, test } from "vitest";
import { computed, type Ref, ref } from "vue";
import {
  createEffectQuery,
  type EffectQueryDefect,
  type EffectQueryFailure,
  isQueryError,
  QueryErrorBoundary,
} from "../../src/vue";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}
class Forbidden extends Data.TaggedError("Forbidden")<{ reason: string }> {}

interface User {
  id: string;
  name: string;
}
interface Page {
  items: string[];
  next: number;
}

class Users extends Context.Service<
  Users,
  {
    readonly get: (id: string) => Effect.Effect<User, NotFound | Forbidden>;
    readonly list: (cursor: number) => Effect.Effect<Page, Forbidden>;
    readonly rename: (
      id: string,
      name: string
    ) => Effect.Effect<User, NotFound>;
  }
>()("test/Users") {}

declare const UsersLive: Layer.Layer<Users>;

const getUser = (id: string) =>
  Effect.gen(function* () {
    const users = yield* Users;
    return yield* users.get(id);
  });
const listUsers = (cursor: number) =>
  Effect.gen(function* () {
    const users = yield* Users;
    return yield* users.list(cursor);
  });
const renameUser = (id: string, name: string) =>
  Effect.gen(function* () {
    const users = yield* Users;
    return yield* users.rename(id, name);
  });

const eq = createEffectQuery(UsersLive);
const queryClient = new QueryClient();

type UserError =
  | EffectQueryFailure<NotFound | Forbidden>
  | EffectQueryDefect<unknown>;

const userOptions = (id: string) =>
  eq.queryOptions({
    queryFn: () => getUser(id),
    queryKey: ["user", id],
  });

describe("queryOptions", () => {
  test("infers data and error refs for useQuery", () => {
    const { data, error } = useQuery(userOptions("1"));
    expectTypeOf(data).toExtend<Ref<User | undefined>>();
    expectTypeOf(data.value).toEqualTypeOf<User | undefined>();
    expectTypeOf(error.value).toEqualTypeOf<UserError | null>();
  });

  test("accepts a getter for reactive options", () => {
    const id = ref("1");
    const { data, error } = useQuery(() => userOptions(id.value));
    expectTypeOf(data.value).toEqualTypeOf<User | undefined>();
    expectTypeOf(error.value).toEqualTypeOf<UserError | null>();

    const fromComputed = useQuery(computed(() => userOptions(id.value)));
    expectTypeOf(fromComputed.data.value).toEqualTypeOf<User | undefined>();
    expectTypeOf(fromComputed.error.value).toEqualTypeOf<UserError | null>();
  });

  test("refs inside the options are unwrapped in the query function context", () => {
    const id = ref("1");
    eq.queryOptions({
      enabled: computed(() => id.value !== ""),
      queryFn: ({ queryKey }) => {
        expectTypeOf(queryKey).toEqualTypeOf<readonly ["user", string]>();
        return getUser(queryKey[1]);
      },
      queryKey: ["user", id] as const,
      staleTime: ref(1000),
    });
  });

  test("only defects are possible when the effect cannot fail", () => {
    const { data, error } = useQuery(
      eq.queryOptions({ queryFn: () => Effect.succeed(42), queryKey: ["n"] })
    );
    expectTypeOf(data.value).toEqualTypeOf<number | undefined>();
    expectTypeOf(
      error.value
    ).toEqualTypeOf<EffectQueryDefect<unknown> | null>();
  });

  test("initialData makes data defined", () => {
    const { data, error } = useQuery(
      eq.queryOptions({
        initialData: { id: "1", name: "initial" },
        queryFn: () => getUser("1"),
        queryKey: ["user", "1"],
      })
    );
    expectTypeOf(data.value).toEqualTypeOf<User>();
    expectTypeOf(error.value).toEqualTypeOf<UserError | null>();
  });

  test("select transforms data while keeping the error", () => {
    const { data, error } = useQuery(
      eq.queryOptions({
        queryFn: () => getUser("1"),
        queryKey: ["user", "1"],
        select: (user) => user.name.length,
      })
    );
    expectTypeOf(data.value).toEqualTypeOf<number | undefined>();
    expectTypeOf(error.value).toEqualTypeOf<UserError | null>();
  });

  test("skipToken is accepted and keeps types", () => {
    const id = undefined as string | undefined;
    const { data, error } = useQuery(
      eq.queryOptions({
        queryFn: id ? () => getUser(id) : skipToken,
        queryKey: ["user", id],
      })
    );
    expectTypeOf(data.value).toEqualTypeOf<User | undefined>();
    expectTypeOf(error.value).toEqualTypeOf<UserError | null>();
  });

  test("tags the queryKey for the QueryClient", () => {
    const options = userOptions("1");
    expectTypeOf(queryClient.getQueryData(options.queryKey)).toEqualTypeOf<
      User | undefined
    >();
    expectTypeOf(
      queryClient.fetchQuery(options)
    ).resolves.toEqualTypeOf<User>();
  });

  test("useQueries keeps per query types", () => {
    const results = useQueries({
      queries: [
        userOptions("1"),
        eq.queryOptions({ queryFn: () => Effect.succeed(42), queryKey: ["n"] }),
      ],
    });
    const [user, answer] = results.value;
    expectTypeOf(user.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(user.error).toEqualTypeOf<UserError | null>();
    expectTypeOf(answer.data).toEqualTypeOf<number | undefined>();
  });

  test("callbacks inside the options receive the effect error", () => {
    eq.queryOptions({
      queryFn: () => getUser("1"),
      queryKey: ["user", "1"],
      retry: (_count, error) => {
        expectTypeOf(error).toEqualTypeOf<UserError>();
        return false;
      },
      throwOnError: (error) => {
        expectTypeOf(error).toEqualTypeOf<UserError>();
        return false;
      },
    });
  });

  test("error.match is exhaustive over the failure tags", () => {
    const { error } = useQuery(userOptions("1"));
    const message = error.value?.match({
      Forbidden: (forbidden) => {
        expectTypeOf(forbidden).toEqualTypeOf<Forbidden>();
        return forbidden.reason;
      },
      NotFound: (notFound) => {
        expectTypeOf(notFound).toEqualTypeOf<NotFound>();
        return notFound.id;
      },
      OrElse: () => "defect",
    });
    expectTypeOf(message).toEqualTypeOf<string | undefined>();
  });

  test("rejects requirements that the layer does not provide", () => {
    class Missing extends Context.Service<Missing, { value: number }>()(
      "test/Missing"
    ) {}
    const readMissing = () =>
      Effect.gen(function* () {
        const missing = yield* Missing;
        return missing.value;
      });
    // @ts-expect-error Missing is not provided by the layer
    eq.queryOptions({ queryFn: readMissing, queryKey: ["missing"] });
  });

  test("rejects untagged failures", () => {
    const failUntagged = () => Effect.fail("boom");
    // @ts-expect-error failures must be tagged
    eq.queryOptions({ queryFn: failUntagged, queryKey: ["untagged"] });
  });
});

describe("infiniteQueryOptions", () => {
  const listOptions = eq.infiniteQueryOptions({
    getNextPageParam: (lastPage) => lastPage.next,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) => listUsers(pageParam),
    queryKey: ["users"],
  });
  type ListError = EffectQueryFailure<Forbidden> | EffectQueryDefect<unknown>;

  test("infers pages and error for useInfiniteQuery", () => {
    const { data, error } = useInfiniteQuery(listOptions);
    expectTypeOf(data.value).toEqualTypeOf<InfiniteData<Page> | undefined>();
    expectTypeOf(error.value).toEqualTypeOf<ListError | null>();
  });

  test("the page param is typed in the query function context", () => {
    eq.infiniteQueryOptions({
      getNextPageParam: (lastPage: Page) => lastPage.next,
      initialPageParam: 0,
      queryFn: ({ pageParam }) => {
        expectTypeOf(pageParam).toEqualTypeOf<number>();
        return listUsers(pageParam);
      },
      queryKey: ["users"],
    });
  });

  test("tags the queryKey for the QueryClient", () => {
    expectTypeOf(queryClient.getQueryData(listOptions.queryKey)).toEqualTypeOf<
      InfiniteData<Page> | undefined
    >();
  });
});

describe("mutationOptions", () => {
  const renameOptions = eq.mutationOptions({
    mutationFn: (variables: { id: string; name: string }) =>
      renameUser(variables.id, variables.name),
    mutationKey: ["rename"],
  });
  type RenameError = EffectQueryFailure<NotFound> | EffectQueryDefect<unknown>;

  test("infers data, error and variables for useMutation", () => {
    const { data, error, mutate, mutateAsync } = useMutation(renameOptions);
    expectTypeOf(data.value).toEqualTypeOf<User | undefined>();
    expectTypeOf(error.value).toEqualTypeOf<RenameError | null>();
    expectTypeOf(mutate)
      .parameter(0)
      .toEqualTypeOf<{ id: string; name: string }>();
    expectTypeOf(mutateAsync).returns.resolves.toEqualTypeOf<User>();
  });

  test("callbacks receive typed data and error", () => {
    eq.mutationOptions({
      mutationFn: (variables: { id: string; name: string }) =>
        renameUser(variables.id, variables.name),
      onError: (error, variables) => {
        expectTypeOf(error).toEqualTypeOf<RenameError>();
        expectTypeOf(variables).toEqualTypeOf<{ id: string; name: string }>();
      },
      onSuccess: (data) => {
        expectTypeOf(data).toEqualTypeOf<User>();
      },
    });
  });

  test("variables default to void", () => {
    const { mutate, error } = useMutation(
      eq.mutationOptions({ mutationFn: () => Effect.succeed("done") })
    );
    expectTypeOf(mutate).parameter(0).toBeVoid();
    expectTypeOf(
      error.value
    ).toEqualTypeOf<EffectQueryDefect<unknown> | null>();
  });
});

describe("QueryErrorBoundary", () => {
  const listOptions = eq.infiniteQueryOptions({
    getNextPageParam: (lastPage) => lastPage.next,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) => listUsers(pageParam),
    queryKey: ["users"],
  });

  test("types the fallback slot error from the bound query", () => {
    const boundary = new QueryErrorBoundary({ query: userOptions("1") });
    type FallbackProps = Parameters<typeof boundary.$slots.fallback>[0];
    expectTypeOf<FallbackProps["error"]>().toEqualTypeOf<UserError>();
    expectTypeOf<FallbackProps["reset"]>().toEqualTypeOf<() => void>();
  });

  test("unions the errors of several queries", () => {
    const boundary = new QueryErrorBoundary({
      query: [userOptions("1"), listOptions],
    });
    type FallbackProps = Parameters<typeof boundary.$slots.fallback>[0];
    expectTypeOf<FallbackProps["error"]>().toEqualTypeOf<
      | EffectQueryFailure<NotFound | Forbidden>
      | EffectQueryFailure<Forbidden>
      | EffectQueryDefect<unknown>
    >();
  });

  test("reads the error from options with a reactive query key", () => {
    const id = ref("1");
    const options = eq.queryOptions({
      queryFn: () => getUser(id.value),
      queryKey: ["user", id],
    });
    const error: unknown = null;
    if (isQueryError(queryClient, options, error)) {
      expectTypeOf(error).toEqualTypeOf<UserError>();
    }
  });

  test("isQueryError narrows to the query error", () => {
    const error: unknown = null;
    if (isQueryError(queryClient, userOptions("1"), error)) {
      expectTypeOf(error).toEqualTypeOf<UserError>();
    }
  });
});

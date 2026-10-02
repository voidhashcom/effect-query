import {
  type InfiniteData,
  QueryClient,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Context, Data, Effect, Layer } from "effect";
import { describe, expectTypeOf, test } from "vitest";
import {
  createEffectQuery,
  type EffectQueryDefect,
  type EffectQueryFailure,
} from "../../src";

class NotFound extends Data.TaggedError("NotFound")<{ id: string }> {}
class Forbidden extends Data.TaggedError("Forbidden")<{ reason: string }> {}

class Users extends Context.Service<
  Users,
  {
    readonly get: (
      id: string
    ) => Effect.Effect<{ id: string; name: string }, NotFound | Forbidden>;
    readonly list: (
      cursor: number
    ) => Effect.Effect<{ items: string[]; next: number }, Forbidden>;
    readonly rename: (
      id: string,
      name: string
    ) => Effect.Effect<{ id: string; name: string }, NotFound>;
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

interface User {
  id: string;
  name: string;
}
type UserError =
  | EffectQueryFailure<NotFound | Forbidden>
  | EffectQueryDefect<unknown>;

const userOptions = (id: string) =>
  eq.queryOptions({
    queryFn: () => getUser(id),
    queryKey: ["user", id],
  });

describe("queryOptions", () => {
  test("infers data and error for useQuery", () => {
    const result = useQuery(userOptions("1"));
    expectTypeOf(result.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(result.error).toEqualTypeOf<UserError | null>();

    if (result.isSuccess) {
      expectTypeOf(result.data).toEqualTypeOf<User>();
    }
    if (result.isError) {
      expectTypeOf(result.error).toEqualTypeOf<UserError>();
    }
  });

  test("infers data and error for useSuspenseQuery", () => {
    const result = useSuspenseQuery(userOptions("1"));
    expectTypeOf(result.data).toEqualTypeOf<User>();
    expectTypeOf(result.error).toEqualTypeOf<UserError | null>();
  });

  test("only defects are possible when the effect cannot fail", () => {
    const result = useQuery(
      eq.queryOptions({
        queryFn: () => Effect.succeed(42),
        queryKey: ["answer"],
      })
    );
    expectTypeOf(result.data).toEqualTypeOf<number | undefined>();
    expectTypeOf(
      result.error
    ).toEqualTypeOf<EffectQueryDefect<unknown> | null>();
  });

  test("initialData makes data defined", () => {
    const result = useQuery(
      eq.queryOptions({
        initialData: { id: "1", name: "initial" },
        queryFn: () => getUser("1"),
        queryKey: ["user", "1"],
      })
    );
    expectTypeOf(result.data).toEqualTypeOf<User>();
    expectTypeOf(result.error).toEqualTypeOf<UserError | null>();
  });

  test("select transforms data while keeping the error", () => {
    const result = useQuery({
      ...userOptions("1"),
      select: (user) => user.name.length,
    });
    expectTypeOf(result.data).toEqualTypeOf<number | undefined>();
    expectTypeOf(result.error).toEqualTypeOf<UserError | null>();

    const inline = useQuery(
      eq.queryOptions({
        queryFn: () => Effect.succeed("hello"),
        queryKey: ["inline-select"],
        select: (value) => value.toUpperCase().split(""),
      })
    );
    expectTypeOf(inline.data).toEqualTypeOf<string[] | undefined>();
  });

  test("skipToken is accepted and keeps types", () => {
    const id: string | undefined = undefined as string | undefined;
    const options = eq.queryOptions({
      queryFn: id ? () => getUser(id) : skipToken,
      queryKey: ["user", id],
    });
    const result = useQuery(options);
    expectTypeOf(result.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(result.error).toEqualTypeOf<UserError | null>();
  });

  test("tags the queryKey for the QueryClient", () => {
    const options = userOptions("1");
    expectTypeOf(queryClient.getQueryData(options.queryKey)).toEqualTypeOf<
      User | undefined
    >();
    expectTypeOf(
      queryClient.getQueryState(options.queryKey)?.error
    ).toEqualTypeOf<UserError | null | undefined>();
    expectTypeOf(
      queryClient.fetchQuery(options)
    ).resolves.toEqualTypeOf<User>();
  });

  test("useQueries keeps per query types", () => {
    const [user, answer] = useQueries({
      queries: [
        userOptions("1"),
        eq.queryOptions({
          queryFn: () => Effect.succeed(42),
          queryKey: ["answer"],
        }),
      ],
    });
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
    if (error) {
      const message = error.match({
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
      expectTypeOf(message).toEqualTypeOf<string>();
    }
  });

  test("the queryFn context is typed", () => {
    eq.queryOptions({
      queryFn: ({ queryKey, signal }) => {
        expectTypeOf(queryKey).toEqualTypeOf<readonly ["typed", 1]>();
        expectTypeOf(signal).toEqualTypeOf<AbortSignal>();
        return Effect.succeed(queryKey[1]);
      },
      queryKey: ["typed", 1] as const,
    });
  });

  test("rejects requirements that the layer does not provide", () => {
    class Missing extends Context.Service<Missing, { value: number }>()(
      "test/Missing"
    ) {}
    eq.queryOptions({
      // @ts-expect-error Missing is not provided by the layer
      queryFn: () =>
        Effect.gen(function* () {
          const missing = yield* Missing;
          return missing.value;
        }),
      queryKey: ["missing"],
    });
  });

  test("rejects untagged failures", () => {
    eq.queryOptions({
      // @ts-expect-error failures must be tagged
      queryFn: () => Effect.fail("boom"),
      queryKey: ["untagged"],
    });
  });

  test("works with an empty layer", () => {
    const empty = createEffectQuery(Layer.empty);
    const result = useQuery(
      empty.queryOptions({
        queryFn: () => Effect.fail(new NotFound({ id: "1" })),
        queryKey: ["empty"],
      })
    );
    expectTypeOf(result.error).toEqualTypeOf<
      EffectQueryFailure<NotFound> | EffectQueryDefect<unknown> | null
    >();
  });
});

describe("infiniteQueryOptions", () => {
  const listOptions = eq.infiniteQueryOptions({
    getNextPageParam: (lastPage) => lastPage.next,
    initialPageParam: 0,
    queryFn: ({ pageParam }: { pageParam: number }) => listUsers(pageParam),
    queryKey: ["users"],
  });
  interface Page {
    items: string[];
    next: number;
  }
  type ListError = EffectQueryFailure<Forbidden> | EffectQueryDefect<unknown>;

  test("infers pages and error for useInfiniteQuery", () => {
    const result = useInfiniteQuery(listOptions);
    expectTypeOf(result.data).toEqualTypeOf<InfiniteData<Page> | undefined>();
    expectTypeOf(result.error).toEqualTypeOf<ListError | null>();
  });

  test("infers pages and error for useSuspenseInfiniteQuery", () => {
    const result = useSuspenseInfiniteQuery(listOptions);
    expectTypeOf(result.data).toEqualTypeOf<InfiniteData<Page>>();
    expectTypeOf(result.error).toEqualTypeOf<ListError | null>();
  });

  test("tags the queryKey for the QueryClient", () => {
    expectTypeOf(queryClient.getQueryData(listOptions.queryKey)).toEqualTypeOf<
      InfiniteData<Page> | undefined
    >();
  });

  test("initialData makes data defined", () => {
    const result = useInfiniteQuery(
      eq.infiniteQueryOptions({
        getNextPageParam: (lastPage) => lastPage.next,
        initialData: { pageParams: [0], pages: [{ items: [], next: 1 }] },
        initialPageParam: 0,
        queryFn: ({ pageParam }: { pageParam: number }) => listUsers(pageParam),
        queryKey: ["users", "initial"],
      })
    );
    expectTypeOf(result.data).toEqualTypeOf<InfiniteData<Page>>();
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
    const result = useMutation(renameOptions);
    expectTypeOf(result.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(result.error).toEqualTypeOf<RenameError | null>();
    expectTypeOf(result.mutate)
      .parameter(0)
      .toEqualTypeOf<{ id: string; name: string }>();
    expectTypeOf(result.mutateAsync).returns.resolves.toEqualTypeOf<User>();
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

    useMutation({
      ...renameOptions,
      onError: (error) => {
        expectTypeOf(error).toEqualTypeOf<RenameError>();
      },
    });
  });

  test("keeps the mutationKey when provided", () => {
    expectTypeOf(renameOptions.mutationKey).not.toBeUndefined();
  });

  test("variables default to void", () => {
    const result = useMutation(
      eq.mutationOptions({ mutationFn: () => Effect.succeed("done") })
    );
    expectTypeOf(result.mutate).parameter(0).toBeVoid();
    expectTypeOf(
      result.error
    ).toEqualTypeOf<EffectQueryDefect<unknown> | null>();
  });
});

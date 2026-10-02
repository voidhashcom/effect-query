import {
  type InfiniteData,
  QueryClient,
  skipToken,
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
} from "@tanstack/solid-query";
import { Context, Data, Effect, type Layer } from "effect";
import { createSignal } from "solid-js";
import { describe, expectTypeOf, test } from "vitest";
import {
  createEffectQuery,
  type EffectQueryDefect,
  type EffectQueryFailure,
} from "../../src/solid";

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
  test("infers data and error for useQuery", () => {
    const query = useQuery(() => userOptions("1"));
    expectTypeOf(query.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(query.error).toEqualTypeOf<UserError | null>();

    if (query.isSuccess) {
      expectTypeOf(query.data).toEqualTypeOf<User>();
    }
    if (query.isError) {
      expectTypeOf(query.error).toEqualTypeOf<UserError>();
    }
  });

  test("works with signals in the accessor", () => {
    const [id] = createSignal("1");
    const query = useQuery(() => userOptions(id()));
    expectTypeOf(query.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(query.error).toEqualTypeOf<UserError | null>();
  });

  test("only defects are possible when the effect cannot fail", () => {
    const query = useQuery(() =>
      eq.queryOptions({ queryFn: () => Effect.succeed(42), queryKey: ["n"] })
    );
    expectTypeOf(query.data).toEqualTypeOf<number | undefined>();
    expectTypeOf(
      query.error
    ).toEqualTypeOf<EffectQueryDefect<unknown> | null>();
  });

  test("initialData makes data defined", () => {
    const query = useQuery(() =>
      eq.queryOptions({
        initialData: { id: "1", name: "initial" },
        queryFn: () => getUser("1"),
        queryKey: ["user", "1"],
      })
    );
    expectTypeOf(query.data).toEqualTypeOf<User>();
    expectTypeOf(query.error).toEqualTypeOf<UserError | null>();
  });

  test("select transforms data while keeping the error", () => {
    const query = useQuery(() =>
      eq.queryOptions({
        queryFn: () => getUser("1"),
        queryKey: ["user", "1"],
        select: (user) => user.name.length,
      })
    );
    expectTypeOf(query.data).toEqualTypeOf<number | undefined>();
    expectTypeOf(query.error).toEqualTypeOf<UserError | null>();
  });

  test("skipToken is accepted and keeps types", () => {
    const id = undefined as string | undefined;
    const query = useQuery(() =>
      eq.queryOptions({
        queryFn: id ? () => getUser(id) : skipToken,
        queryKey: ["user", id],
      })
    );
    expectTypeOf(query.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(query.error).toEqualTypeOf<UserError | null>();
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
    const [user, answer] = useQueries(() => ({
      queries: [
        userOptions("1"),
        eq.queryOptions({ queryFn: () => Effect.succeed(42), queryKey: ["n"] }),
      ],
    }));
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
    const query = useQuery(() => userOptions("1"));
    const message = query.error?.match({
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
    const query = useInfiniteQuery(() => listOptions);
    expectTypeOf(query.data).toEqualTypeOf<InfiniteData<Page> | undefined>();
    expectTypeOf(query.error).toEqualTypeOf<ListError | null>();
  });

  test("initialData makes data defined", () => {
    const query = useInfiniteQuery(() =>
      eq.infiniteQueryOptions({
        getNextPageParam: (lastPage) => lastPage.next,
        initialData: { pageParams: [0], pages: [{ items: [], next: 1 }] },
        initialPageParam: 0,
        queryFn: ({ pageParam }: { pageParam: number }) => listUsers(pageParam),
        queryKey: ["users", "initial"],
      })
    );
    expectTypeOf(query.data).toEqualTypeOf<InfiniteData<Page>>();
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
    const mutation = useMutation(() => renameOptions);
    expectTypeOf(mutation.data).toEqualTypeOf<User | undefined>();
    expectTypeOf(mutation.error).toEqualTypeOf<RenameError | null>();
    expectTypeOf(mutation.mutate)
      .parameter(0)
      .toEqualTypeOf<{ id: string; name: string }>();
    expectTypeOf(mutation.mutateAsync).returns.resolves.toEqualTypeOf<User>();
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
    const mutation = useMutation(() =>
      eq.mutationOptions({ mutationFn: () => Effect.succeed("done") })
    );
    expectTypeOf(mutation.mutate).parameter(0).toBeVoid();
    expectTypeOf(
      mutation.error
    ).toEqualTypeOf<EffectQueryDefect<unknown> | null>();
  });
});

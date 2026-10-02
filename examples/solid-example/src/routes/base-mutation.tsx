import { useMutation } from "@tanstack/solid-query";
import {
  Cause,
  Console,
  Context,
  Data,
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
} from "effect";
import { createEffectQueryFromManagedRuntime } from "effect-query/solid";
import { createSignal, Show } from "solid-js";

class UserUpdateError extends Data.TaggedError("UserUpdateError")<{
  message: string;
}> {}

class UserApi extends Context.Service<
  UserApi,
  {
    readonly updateUser: (id: string) => Effect.Effect<string, UserUpdateError>;
  }
>()("example/UserApi") {}

const UserApiLive = Layer.succeed(UserApi)({
  updateUser: (id: string) =>
    Effect.gen(function* () {
      yield* Effect.sleep(Duration.millis(1000));
      yield* Console.log(`Updating user ${id}...`);
      if (Math.random() < 0.5) {
        return yield* Effect.fail(
          new UserUpdateError({ message: "Failed to update user" })
        );
      }
      return "User updated";
    }),
});

const managedRuntime = ManagedRuntime.make(UserApiLive);
const eq = createEffectQueryFromManagedRuntime(managedRuntime);

export default function BaseMutation() {
  const [message, setMessage] = createSignal("");

  const mutation = useMutation(() =>
    eq.mutationOptions({
      mutationFn: (variables: { id: string }) =>
        Effect.gen(function* () {
          const userApi = yield* UserApi;
          return yield* userApi.updateUser(variables.id);
        }),
      mutationKey: ["update-user"],
      onError: (error) =>
        setMessage(
          error.match({
            OrElse: (cause) => `Error updating user: ${Cause.pretty(cause)}`,
            UserUpdateError: (userUpdateError) => userUpdateError.message,
          })
        ),
      onSuccess: (data) => setMessage(data),
    })
  );

  return (
    <div>
      <p>Uses a `ManagedRuntime` built from a `Context.Service`.</p>
      <button onClick={() => mutation.mutate({ id: "user-123" })} type="button">
        Update User
      </button>
      <Show when={mutation.isPending}>
        <div>Updating...</div>
      </Show>
      <Show when={!mutation.isPending && message()}>
        <div>{message()}</div>
      </Show>
    </div>
  );
}

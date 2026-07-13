/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
/** biome-ignore-all lint/suspicious/noAlert: dev example */
import { useMutation } from "@tanstack/react-query";
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
import { createEffectQueryFromManagedRuntime } from "effect-query";

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
      yield* Console.log("Updating user...");
      return "User updated";
    }),
});

export const managedRuntime = ManagedRuntime.make(UserApiLive);
export const eq = createEffectQueryFromManagedRuntime(managedRuntime);

// You can move this outside of the component and even share it with other components
const updateUserOptions = eq.mutationOptions({
  mutationFn: (variables: { id: string }) =>
    Effect.gen(function* () {
      const userApi = yield* UserApi;
      return yield* userApi.updateUser(variables.id);
    }),
});

export default function UpdateUserPage() {
  const id = "user-123";
  const { mutate } = useMutation({
    ...updateUserOptions,
    onError: (error) =>
      error.match({
        UserUpdateError: (userUpdateError) => {
          alert(`${userUpdateError.message}`);
        },

        OrElse: (cause) => {
          alert(`Error updating user: ${Cause.pretty(cause)}`);
        },
      }),
    onSuccess: () => {
      alert("User updated!");
    },
  });
  return (
    <div>
      <p>Uses a `ManagedRuntime` built from a v4 `Context.Service`.</p>
      <button
        onClick={() =>
          mutate({
            id,
          })
        }
        type="button"
      >
        Update User
      </button>
    </div>
  );
}

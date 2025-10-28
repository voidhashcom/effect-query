/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
/** biome-ignore-all lint/suspicious/noAlert: dev example */

import { createEffectQueryFromManagedRuntime } from "@effect-query/solid";
import { useMutation } from "@tanstack/solid-query";
import {
  Cause,
  Console,
  Data,
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
} from "effect";

export const managedRuntime = ManagedRuntime.make(Layer.empty);
export const eq = createEffectQueryFromManagedRuntime(managedRuntime);

class UserUpdateError extends Data.TaggedError("UserUpdateError")<{
  message: string;
}> {}

// You can move this outside of the component and even share it with other components
const updateUserOptions = eq.mutationOptions({
  mutationKey: "updateUserOptions",
  mutationFn: () =>
    Effect.gen(function* () {
      yield* Effect.sleep(Duration.millis(1000));
      if (Math.random() < 0.5) {
        return yield* Effect.fail(
          new UserUpdateError({ message: "Failed to update user" })
        );
      }
      yield* Console.log("Updating user...");
      return Effect.succeed("User updated");
    }),
});

export default function BaseMutationRoute(props: { id?: string }) {
  const mutation = useMutation(() => ({
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
  }));

  return (
    <button
      onClick={() => mutation.mutate({ id: props.id ?? "default" })}
      type="button"
    >
      Update User
    </button>
  );
}

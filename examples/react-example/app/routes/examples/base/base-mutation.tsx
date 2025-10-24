/** biome-ignore-all lint/style/noMagicNumbers: dev example */
/** biome-ignore-all lint/correctness/noNestedComponentDefinitions: not components */
/** biome-ignore-all lint/suspicious/noAlert: dev example */
import { useMutation } from "@tanstack/react-query";
import { Cause, Console, Data, Duration, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query";

export const eq = createEffectQuery(Layer.empty);

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

export default function UpdateUserPage({ id }: { id: string }) {
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
    <button onClick={() => mutate({ id })} type="button">
      Update User
    </button>
  );
}

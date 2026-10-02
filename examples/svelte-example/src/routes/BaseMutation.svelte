<script lang="ts">
  import { createMutation } from "@tanstack/svelte-query";
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
  import { createEffectQueryFromManagedRuntime } from "effect-query/svelte";

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

  let message = $state("");

  const mutation = createMutation(() =>
    eq.mutationOptions({
      mutationFn: (variables: { id: string }) =>
        Effect.gen(function* () {
          const userApi = yield* UserApi;
          return yield* userApi.updateUser(variables.id);
        }),
      mutationKey: ["update-user"],
      onError: (error) => {
        message = error.match({
          OrElse: (cause) => `Error updating user: ${Cause.pretty(cause)}`,
          UserUpdateError: (userUpdateError) => userUpdateError.message,
        });
      },
      onSuccess: (data) => {
        message = data;
      },
    })
  );
</script>

<div>
  <p>Uses a `ManagedRuntime` built from a `Context.Service`.</p>
  <button onclick={() => mutation.mutate({ id: "user-123" })} type="button">
    Update User
  </button>
  {#if mutation.isPending}
    <div>Updating...</div>
  {:else if message}
    <div>{message}</div>
  {/if}
</div>

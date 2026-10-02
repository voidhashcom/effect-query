<script setup lang="ts">
import { useMutation } from "@tanstack/vue-query";
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
import { createEffectQueryFromManagedRuntime } from "effect-query/vue";
import { ref } from "vue";

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

const message = ref("");

const { mutate, status } = useMutation(
  eq.mutationOptions({
    mutationFn: (variables: { id: string }) =>
      Effect.gen(function* () {
        const userApi = yield* UserApi;
        return yield* userApi.updateUser(variables.id);
      }),
    mutationKey: ["update-user"],
    onError: (error) => {
      message.value = error.match({
        OrElse: (cause) => `Error updating user: ${Cause.pretty(cause)}`,
        UserUpdateError: (userUpdateError) => userUpdateError.message,
      });
    },
    onSuccess: (data) => {
      message.value = data;
    },
  })
);
</script>

<template>
  <div>
    <p>Uses a `ManagedRuntime` built from a `Context.Service`.</p>
    <button type="button" @click="mutate({ id: 'user-123' })">Update User</button>
    <div v-if="status === 'pending'">Updating...</div>
    <div v-else-if="message">{{ message }}</div>
  </div>
</template>

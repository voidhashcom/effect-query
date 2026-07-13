import { Console, Context, Duration, Effect, Layer, Schema } from "effect";
import { Rpc, type RpcClient, RpcGroup, RpcTest } from "effect/unstable/rpc";
import { createEffectQuery } from "effect-query";

const greetingDelay = Duration.millis(250);
const renameDelay = Duration.seconds(1);

class RenameUserError extends Schema.TaggedErrorClass<RenameUserError>()(
  "RenameUserError",
  {
    message: Schema.String,
  }
) {}

const GetGreeting = Rpc.make("GetGreeting", {
  payload: {
    name: Schema.String,
  },
  success: Schema.String,
});

const RenameUser = Rpc.make("RenameUser", {
  payload: {
    id: Schema.String,
    name: Schema.String,
  },
  success: Schema.String,
  error: RenameUserError,
});

const ExampleRpcGroup = RpcGroup.make(GetGreeting, RenameUser);

const ExampleRpcHandlersLive = ExampleRpcGroup.toLayer({
  GetGreeting: ({ name }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(greetingDelay);
      return `Hello, ${name}, from Effect RPC!`;
    }),
  RenameUser: ({ id, name }) =>
    Effect.gen(function* () {
      yield* Effect.sleep(renameDelay);
      yield* Console.log(`Renaming ${id} to ${name}...`);
      if (name === "HAL") {
        return yield* Effect.fail(
          new RenameUserError({ message: "HAL is already reserved." })
        );
      }
      return `Updated ${id} to ${name}`;
    }),
});

export class ExampleRpcClient extends Context.Service<
  ExampleRpcClient,
  RpcClient.FromGroup<typeof ExampleRpcGroup>
>()("example/ExampleRpcClient") {}

export const ExampleRpcClientLive = Layer.effect(ExampleRpcClient)(
  RpcTest.makeClient(ExampleRpcGroup)
).pipe(Layer.provide(ExampleRpcHandlersLive));

export const rpcEq = createEffectQuery(ExampleRpcClientLive);

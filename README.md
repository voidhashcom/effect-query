<p align="center">
    <img src="./banner.png" alt="effect-query logo">
</p>

# Effect Query

<a href="https://www.npmjs.com/package/effect-query" target="\_parent">
  <img alt="" src="https://img.shields.io/npm/dm/effect-query.svg" alt="npm downloads" />
</a>
 <a href="https://github.com/voidhashcom/effect-query/" target="\_parent">
  <img alt="" src="https://img.shields.io/github/stars/voidhashcom/effect-query.svg?style=social&label=Star" alt="GitHub stars" />
</a>

Integration of Effect-ts with Tanstack Query. Run your Effects from Tanstack Query. Fully type-safe and compatible with Effect RPC and Effect HttpApi.

## Quick Start

```bash
# Install the package
npm install effect-query

# Install peer dependencies (if not already installed)
npm install @tanstack/react-query effect

```

# Initialize

```tsx
// src/utils/effect-query.ts
import { useQuery } from "@tanstack/react-query";
import { createEffectQuery } from "effect-query";
import { Context, Effect, Layer, ManagedRuntime } from "effect";

export class GreetingApi extends Context.Service<
  GreetingApi,
  {
    readonly loadGreeting: () => Effect.Effect<string>;
  }
>()("example/GreetingApi") {}

const GreetingApiLive = Layer.succeed(GreetingApi)({
  loadGreeting: () => Effect.succeed("Hello, world!"),
});

export const eq = createEffectQuery(GreetingApiLive);

// Alternative: Create from effect-query from ManagedRuntime instead of Layer
import { createEffectQueryFromManagedRuntime } from "effect-query";

const runtime = ManagedRuntime.make(GreetingApiLive);
export const eqFromRuntime = createEffectQueryFromManagedRuntime(runtime);
```

# Query Example

```tsx
// src/pages/example.tsx
import { useQuery } from "@tanstack/react-query";
import { Effect } from "effect";
import { GreetingApi, eq } from "./effect-query";

export default function HomeRoute() {
  const { data, status } = useQuery(
    eq.queryOptions({
      queryKey: ["namespace", "action"],
      queryFn: () =>
        Effect.gen(function* () {
          const greetingApi = yield* GreetingApi;
          return yield* greetingApi.loadGreeting();
        }),
    })
  );

  return (
    <div>
      {status === "pending" && <div>Loading...</div>}
      {status === "success" && <div>{data}</div>}
    </div>
  );
}
```

# Mutation Example

```tsx
// src/pages/users.tsx
import { createEffectQueryFromManagedRuntime } from "effect-query";
import { useMutation } from "@tanstack/react-query";
import {
  Console,
  Context,
  Data,
  Duration,
  Effect,
  Layer,
  ManagedRuntime,
} from "effect";

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
      return "User updated";
    }),
});

const runtime = ManagedRuntime.make(UserApiLive);
export const eq = createEffectQueryFromManagedRuntime(runtime);

// You can move this outside of the component and even share it with other components
const updateUserOptions = eq.mutationOptions({
  mutationKey: ["updateUserOptions"],
  mutationFn: (variables: { id: string }) =>
    Effect.gen(function* () {
      const userApi = yield* UserApi;
      return yield* userApi.updateUser(variables.id);
    }),
});

function UpdateUserPage({ id }: { id: string }) {
  const { mutate } = useMutation(updateUserOptions);
  return <button onClick={() => mutate({ id })}>Update User</button>;
}
```

# Error Handling

When your Effect fails, the error object includes a `match` function that lets you handle different error types in a type-safe manner. When using match, the `OrElse` case is used as a catch-all for all the remaining unhandled failures and for defects. We are not able to fully check if defects can occur and therefore `OrElse` is required.

```tsx
function Example() {
  const { data, status, error } = useQuery({
    /** ... */
  });

  if (status === "error" && error) {
    return error.match({
      QueryError: (queryError) => <div>Query error: {queryError.hello}</div>,
      TestError: (testError) => <div>Test error: {testError.message}</div>,
      OrElse: (cause) => <div>Error: {Cause.pretty(cause)}</div>,
    });
  }
}
```

Match can be also used to handle errors during mutations.

## Mutation Error Handling

The same pattern works for mutations, allowing you to handle errors in callbacks:

```tsx
export default function UpdateUserPage({ id }: { id: string }) {
  const { mutate } = useMutation({
    /*...*/
    onError: (error) =>
      error.match({
        UserUpdateError: (userUpdateError) => {
          alert(`${userUpdateError.message}`);
        },
        OrElse: (cause) => {
          alert(`Error updating user: ${Cause.pretty(cause)}`);
        },
      }),
  });
}
```

# Usage with Effect HttpApi

```tsx
// src/utils/effect-query.ts
import { useQuery } from "@tanstack/react-query";
import { createEffectQuery } from "effect-query";
import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { HttpApiSpec } from "./http-api-spec";

// Create your ApiClient service
export class ApiClient extends Context.Service<
  ApiClient,
  HttpApiClient.ForApi<typeof HttpApiSpec>
>()("example/ApiClient", {
  make: HttpApiClient.make(HttpApiSpec, {
    baseUrl: "https://api.example.com",
  }),
}) {}

// Create a final layer for your Effect Query
export const LiveLayer = Layer.effect(ApiClient)(ApiClient.make).pipe(
  Layer.provide(FetchHttpClient.layer)
);

export const eq = createEffectQuery(LiveLayer);

// Use it in your components
export default function HomeRoute() {
  const { data, status, error } = useQuery(
    eq.queryOptions({
      queryKey: ["example", "hello-world"],
      queryFn: () =>
        Effect.gen(function* () {
          const apiClient = yield* ApiClient;
          return yield* apiClient.hello.helloWorld({
            /* ... */
          });
        }),
    })
  );
}
```

# Usage with Effect RPC

```tsx
// src/utils/effect-query.ts
import { useQuery } from "@tanstack/react-query";
import { createEffectQuery } from "effect-query";
import { Context, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { RpcClient, RpcSerialization } from "effect/unstable/rpc";
import { RpcGroups } from "./rpc-schema";

const API_DOMAIN = "https://api.example.com";

// Create RpcProtocol layer for your RPC client
export const RpcProtocolLive = RpcClient.layerProtocolHttp({
  url: `${API_DOMAIN}/rpc`,
}).pipe(
  Layer.provideMerge(
    Layer.mergeAll(FetchHttpClient.layer, RpcSerialization.layerNdjson)
  )
);

// Create your ApiClient service
export class MyRpcClient extends Context.Service<MyRpcClient>()(
  "example/MyRpcClient",
  {
    make: RpcClient.make(RpcGroups),
  }
) {}

// Create a final layer for your Effect Query
export const LiveLayer = Layer.effect(MyRpcClient)(MyRpcClient.make).pipe(
  Layer.provide(RpcProtocolLive)
);

export const eq = createEffectQuery(LiveLayer);

// Use it in your components
export default function HomeRoute() {
  const { data, status, error } = useQuery(
    eq.queryOptions({
      queryKey: ["example", "hello-world"],
      queryFn: () => Effect.gen(function* () {
        const rpcClient = yield* MyRpcClient;
        return yield* rpcClient.HelloWorld();
      }),
    })
  );
}
```

# Mutation with Effect RPC

```tsx
// src/pages/users.tsx
import { useMutation } from "@tanstack/react-query";
import { Cause, Effect } from "effect";
import { MyRpcClient, eq } from "./effect-query";

export default function UpdateUserPage() {
  const { mutate } = useMutation(
    eq.mutationOptions({
      mutationKey: ["example", "rename-user"],
      mutationFn: (variables: { id: string; name: string }) =>
        Effect.gen(function* () {
          const rpcClient = yield* MyRpcClient;
          return yield* rpcClient.RenameUser(variables);
        }),
      onError: (error) =>
        error.match({
          RenameUserError: (renameUserError) => {
            alert(renameUserError.message);
          },
          OrElse: (cause) => {
            alert(`Error updating user: ${Cause.pretty(cause)}`);
          },
        }),
    })
  );

  return (
    <button onClick={() => mutate({ id: "user-123", name: "Ripley" })}>
      Rename User
    </button>
  );
}
```

---

<p align="center">
  Made with ❤️ by <a href="https://voidhash.com">Voidhash</a>
</p>

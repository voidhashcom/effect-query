<p align="center">
    <img src="./banner.png" alt="Better Auth Logo">
</p>

# Effect Query

Integration of Effect-ts with Tanstack Query. Run your Effects from Tanstack Query. Fully type-safe and compatible with Effect RPC and Effect HttpApi.

## Quick Start

```bash
# Install the package
npm install effect-query

# Install peer dependencies (if not already installed)
npm install @tanstack/react-query effect react

```

# Initialize

```ts
// src/utils/effect-query.ts
import { createEffectQuery } from "effect-query";
import { Layer } from "effect";

export const eq = createEffectQuery(Layer.empty);
```

# Query Example

```tsx
// src/pages/example.tsx
import { useQuery } from "@tanstack/react-query";
import { Effect } from "effect";
import { eq } from "./effect-query";

export const eq = createEffectQuery(Layer.empty);
export default function HomeRoute() {
  const { data, status } = useQuery(
    eq.queryOptions({
      queryKey: ["namespace", "action"],
      queryFn: () => Effect.succeed("Hello, world!"),
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
import { eq } from "./effectQuery";
import { useMutation } from "@tanstack/react-query";

// You can move this outside of the component and even share it with other components
const updateUserOptions = eq.mutationOptions({
  mutationKey: "updateUserOptions"
  mutationFn: () => Effect.gen(function* () {
    const user = yield* Effect.sleep(1000);
    yield* Console.log("Updating user...");
    return Effect.succeed("User updated");
  }),
});

function UpdateUserPage({ id }: { id: string }) {
  const { mutate } = useMutation(updateUserOptions);
  return <button onClick={() => mutate({ id })}>Update User</button>;
}
```

# Usage with Effect HttpApi

```ts
// src/utils/effect-query.ts
import { createEffectQuery } from "effect-query";
import { Layer } from "effect";
import { HttpApiClient } from "@effect/http-api";

// TODO:

export const eq = createEffectQuery(Layer.empty);
```

# Usage with Effect RPC

```ts
// src/utils/effect-query.ts
import { createEffectQuery } from "effect-query";
import { Layer } from "effect";
import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";

const API_DOMAIN = "https://api.example.com";

// Create RpcProtocol layer for your RPC client
export const RpcProtocolLive = RpcClient.layerProtocolHttp({
  url: `${API_DOMAIN}/rpc`,
}).pipe(
  Layer.provide([
    // use fetch for http requests
    FetchHttpClient.layer
    // use ndjson for serialization
    RpcSerialization.layerNdjson,
  ])
);

// Create your RPC client
export const MyRpcClient = RpcClient.make(RpcGroups);

// Create a final layer for your Effect Query
export const LiveLayer = Layer.mergeAll(RpcProtocolLive);

export const eq = createEffectQuery(LiveLayer);
```

---

<p align="center">
  Made with ❤️ by <a href="https://voidhash.com">Voidhash</a>
</p>

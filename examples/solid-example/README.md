# Effect Query – Solid example

Vite + Solid app using `effect-query/solid` with `@tanstack/solid-query`.

```bash
pnpm install
pnpm --filter effect-query build
pnpm --filter @effect-query/solid-example dev
```

Routes: base query (reactive key + typed errors), base mutation, infinite query and Effect RPC query/mutation.

`pnpm typecheck` checks that data and error types are inferred inside the components.

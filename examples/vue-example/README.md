# Effect Query – Vue example

Vite + Vue 3 app using `effect-query/vue` with `@tanstack/vue-query`.

```bash
pnpm install
pnpm --filter effect-query build
pnpm --filter @effect-query/vue-example dev
```

Routes: base query (reactive key + typed errors), base mutation, infinite query and Effect RPC query/mutation.

`pnpm typecheck` runs `vue-tsc`, which checks that data and error types are inferred inside the SFCs.

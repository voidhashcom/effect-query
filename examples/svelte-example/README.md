# Effect Query – Svelte example

Vite + Svelte 5 app using `effect-query/svelte` with `@tanstack/svelte-query` (v6, runes).

```bash
pnpm install
pnpm --filter effect-query build
pnpm --filter @effect-query/svelte-example dev
```

Routes: base query (reactive key + typed errors), base mutation, infinite query and Effect RPC query/mutation.

`pnpm typecheck` runs `svelte-check`, which checks that data and error types are inferred inside the components.

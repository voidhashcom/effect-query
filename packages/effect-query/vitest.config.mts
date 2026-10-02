// vitest.config.mts

import { svelte } from "@sveltejs/vite-plugin-svelte";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";
import { playwright } from "@vitest/browser-playwright";
import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

// Vitest mutates the browser instances, so every project needs its own copy.
const browser = () => ({
  enabled: true,
  headless: true,
  instances: [{ browser: "chromium" as const }],
  provider: playwright(),
});

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          environment: "node",
          include: ["test/core/**/*.test.ts"],
          name: "core",
        },
      },
      {
        plugins: [react()],
        test: {
          browser: browser(),
          include: ["test/react/**/*.test.{ts,tsx}"],
          name: "react",
          setupFiles: ["./test/react/setup-file.tsx"],
          typecheck: {
            enabled: true,
            include: ["test/react/**/*.test-d.{ts,tsx}"],
          },
        },
      },
      {
        plugins: [vue()],
        test: {
          browser: browser(),
          include: ["test/vue/**/*.test.ts"],
          name: "vue",
          typecheck: {
            enabled: true,
            include: ["test/vue/**/*.test-d.ts"],
          },
        },
      },
      {
        plugins: [solid()],
        test: {
          browser: browser(),
          include: ["test/solid/**/*.test.ts"],
          name: "solid",
          typecheck: {
            enabled: true,
            include: ["test/solid/**/*.test-d.ts"],
          },
        },
      },
      {
        plugins: [svelte()],
        resolve: { conditions: ["browser"] },
        test: {
          browser: browser(),
          include: ["test/svelte/**/*.test.ts"],
          name: "svelte",
          typecheck: {
            enabled: true,
            include: ["test/svelte/**/*.test-d.ts"],
          },
        },
      },
    ],
  },
});

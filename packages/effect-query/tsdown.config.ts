import { defineConfig } from "tsdown";

export const input = {
  index: "./src/index.ts",
  react: "./src/react/index.ts",
};

export default defineConfig({
  dts: {
    sourcemap: true,
    tsconfig: "./tsconfig.build.json",
  },
  entry: input,
  // unbundle: true,
  format: ["cjs", "esm"],
  outExtensions: (ctx) => ({
    dts: ctx.format === "cjs" ? ".d.cts" : ".d.mts",
    js: ctx.format === "cjs" ? ".cjs" : ".mjs",
  }),
  target: ["es2017"],
});

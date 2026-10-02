// vitest.config.mts

import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const browser = {
  enabled: true,
  headless: true,
  instances: [{ browser: "chromium" as const }],
  provider: playwright(),
};

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          browser,
          include: ["test/react/**/*.test.{ts,tsx}"],
          name: "react",
          setupFiles: ["./test/react/setup-file.tsx"],
          typecheck: {
            enabled: true,
            include: ["test/react/**/*.test-d.{ts,tsx}"],
          },
        },
      },
    ],
  },
});

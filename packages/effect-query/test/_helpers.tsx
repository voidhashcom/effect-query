import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// biome-ignore lint/style/useImportType: UMD global
import React from "react";
import { vi } from "vitest";

export const queryClient = new QueryClient();
export const HooksWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export function afterQueryFinish(
  callback: () => void,
  q1: {
    current: {
      status: "success" | "error" | "pending";
    };
  },
  q2?: {
    current: {
      status: "success" | "error" | "pending";
    };
  }
) {
  return vi.waitFor(
    () => {
      if (
        q1.current.status !== "success" ||
        (q2 && q2.current.status !== "success")
      ) {
        throw new Error("Not loaded yet");
      }
      callback();
    },
    { timeout: 1000 }
  );
}

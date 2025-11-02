import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// biome-ignore lint/style/useImportType: UMD global
import React from "react";

export const queryClient = new QueryClient();
export const HooksWrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

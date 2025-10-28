import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { Suspense } from "solid-js";
import "./app.css";
import { queryClient } from "./lib/query-client";

export default function App() {
  return (
    <Router
      root={(props) => (
        <QueryClientProvider client={queryClient}>
          <MetaProvider>
            <Title>Effect Query Solid Example</Title>
            <a href="/">Index</a>
            <a href="/about">About</a>
            <Suspense>{props.children}</Suspense>
          </MetaProvider>
        </QueryClientProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}

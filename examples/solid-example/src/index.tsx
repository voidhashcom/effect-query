import { Route, Router } from "@solidjs/router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";
import type { ParentProps } from "solid-js";
import { render } from "solid-js/web";
import BaseMutation from "./routes/base-mutation";
import BaseQuery from "./routes/base-query";
import Home from "./routes/home";
import InfiniteQuery from "./routes/infinite-query";
import RpcMutation from "./routes/rpc-mutation";
import RpcQuery from "./routes/rpc-query";

const queryClient = new QueryClient();

const Layout = (props: ParentProps) => (
  <QueryClientProvider client={queryClient}>
    <main>
      <a href="/">Home</a>
      {props.children}
    </main>
  </QueryClientProvider>
);

const root = document.getElementById("root");
if (root) {
  render(
    () => (
      <Router root={Layout}>
        <Route component={Home} path="/" />
        <Route component={BaseQuery} path="/examples/base/base-query" />
        <Route component={BaseMutation} path="/examples/base/base-mutation" />
        <Route
          component={InfiniteQuery}
          path="/examples/infinite/infinite-query"
        />
        <Route component={RpcQuery} path="/examples/rpc/rpc-query" />
        <Route component={RpcMutation} path="/examples/rpc/rpc-mutation" />
      </Router>
    ),
    root
  );
}

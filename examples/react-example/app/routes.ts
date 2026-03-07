import {
  index,
  layout,
  prefix,
  type RouteConfig,
  route,
} from "@react-router/dev/routes";

export default [
  layout("components/core-layout.tsx", [
    index("routes/home.tsx"),
    ...prefix("examples", [
      ...prefix("base", [
        route("base-query", "routes/examples/base/base-query.tsx"),
        route("base-mutation", "routes/examples/base/base-mutation.tsx"),
      ]),
      ...prefix("rpc", [
        route("rpc-query", "routes/examples/rpc/rpc-query.tsx"),
        route("rpc-mutation", "routes/examples/rpc/rpc-mutation.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig;

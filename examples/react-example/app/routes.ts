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
      ...prefix("tanstack-db", [
        route("simple", "routes/examples/tanstack-db/simple.tsx"),
      ]),
    ]),
  ]),
] satisfies RouteConfig;

import { NavLink } from "react-router";

export function meta() {
  return [
    { title: "Effect Query React Example" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function HomeRoute() {
  return (
    <div>
      <NavLink to="/examples/base/base-query"> Base Query</NavLink>
      <NavLink to="/examples/base/base-mutation"> Base Mutation</NavLink>
    </div>
  );
}

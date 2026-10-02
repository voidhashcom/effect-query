export default function Home() {
  return (
    <nav style={{ display: "flex", "flex-direction": "column" }}>
      <a href="/examples/base/base-query">Base Query</a>
      <a href="/examples/base/base-mutation">Base Mutation</a>
      <a href="/examples/infinite/infinite-query">Infinite Query</a>
      <a href="/examples/rpc/rpc-query">RPC Query</a>
      <a href="/examples/rpc/rpc-mutation">RPC Mutation</a>
    </nav>
  );
}

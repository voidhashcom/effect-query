import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

export default function Home() {
  return (
    <main>
      <Title>Effect Query Solid Example</Title>
      <h1>Effect Query Solid Example</h1>
      <div>
        <A href="/examples/base/base-query">Base Query</A>
      </div>
      <div>
        <A href="/examples/base/base-mutation">Base Mutation</A>
      </div>
    </main>
  );
}

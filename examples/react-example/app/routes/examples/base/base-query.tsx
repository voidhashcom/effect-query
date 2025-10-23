/** biome-ignore-all lint/style/noMagicNumbers: <explanation> */
import { useQuery } from "@tanstack/react-query";
import { Cause, Data, Effect, Layer } from "effect";
import { createEffectQuery } from "effect-query";

class QueryError extends Data.TaggedError("QueryError")<{ message: string }> {}
export const eq = createEffectQuery(Layer.empty);
export default function HomeRoute() {
  const { data, status, error } = useQuery(
    eq.queryOptions({
      queryKey: ["namespace", "action"],
      queryFn: () =>
        Effect.gen(function* () {
          if (Math.random() < 0.5) {
            return yield* Effect.fail(
              new QueryError({ message: "Failed to query" })
            );
          }
          return "Hello, world!";
        }),
    })
  );

  return (
    <div>
      {status === "pending" && <div>Loading...</div>}
      {status === "success" && <div>{data}</div>}
      {status === "error" && Cause.isFailure(error.cause) && (
        <div>Error: {Cause.pretty(error.cause)}</div>
      )}
    </div>
  );
}

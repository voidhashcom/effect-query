import { createCollection, useLiveQuery } from "@tanstack/react-db";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { queryClient } from "~/lib/query-client";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

const todosCollection = createCollection(
  queryCollectionOptions<Todo>({
    queryKey: ["todos"] as const,
    queryFn: async () => [
      {
        id: "1",
        title: "Upgrade the examples",
        completed: true,
      },
      {
        id: "2",
        title: "Verify the workspace typechecks",
        completed: false,
      },
    ],
    queryClient,
    getKey: (item) => item.id,
  })
);

export default function TanStackDbSimpleRoute() {
  const { data, isLoading, isReady } = useLiveQuery(todosCollection);

  if (isLoading && !isReady) {
    return <div>Loading todos...</div>;
  }

  return (
    <div>
      <h2>TanStack DB Collection</h2>
      <ul>
        {data.map((todo) => (
          <li key={todo.id}>
            <strong>{todo.title}</strong> {todo.completed ? "done" : "pending"}
          </li>
        ))}
      </ul>
    </div>
  );
}

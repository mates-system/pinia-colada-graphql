/**
 * Mock GraphQL server for the playground.
 * In a real application, you would use an actual GraphQL server.
 */

interface User {
  id: string;
  name: string;
  email: string;
  __typename: "User";
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  __typename: "Post";
}

// Mock data
let users: User[] = [
  { id: "1", name: "Alice", email: "alice@example.com", __typename: "User" },
  { id: "2", name: "Bob", email: "bob@example.com", __typename: "User" },
  { id: "3", name: "Charlie", email: "charlie@example.com", __typename: "User" },
];

let posts: Post[] = [
  { id: "1", title: "Hello World", content: "First post!", authorId: "1", __typename: "Post" },
  {
    id: "2",
    title: "GraphQL is great",
    content: "I love GraphQL",
    authorId: "2",
    __typename: "Post",
  },
];

let nextUserId = 4;
let nextPostId = 3;

// Resolvers
const resolvers: Record<string, (args: Record<string, unknown>) => unknown> = {
  users: () => users,

  user: ({ id }: { id: string }) => users.find((u) => u.id === id),

  posts: () =>
    posts.map((post) => ({
      ...post,
      author: users.find((u) => u.id === post.authorId),
    })),

  post: ({ id }: { id: string }) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return null;
    return {
      ...post,
      author: users.find((u) => u.id === post.authorId),
    };
  },

  createUser: ({ name, email }: { name: string; email: string }) => {
    const user: User = {
      id: String(nextUserId++),
      name,
      email,
      __typename: "User",
    };
    users.push(user);
    return user;
  },

  updateUser: ({ id, name, email }: { id: string; name?: string; email?: string }) => {
    const user = users.find((u) => u.id === id);
    if (!user) return null;
    if (name) user.name = name;
    if (email) user.email = email;
    return user;
  },

  deleteUser: ({ id }: { id: string }) => {
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    users.splice(index, 1);
    return true;
  },

  createPost: ({
    title,
    content,
    authorId,
  }: {
    title: string;
    content: string;
    authorId: string;
  }) => {
    const post: Post = {
      id: String(nextPostId++),
      title,
      content,
      authorId,
      __typename: "Post",
    };
    posts.push(post);
    return {
      ...post,
      author: users.find((u) => u.id === authorId),
    };
  },
};

/**
 * Execute a GraphQL operation against the mock server.
 */
export function executeMock(
  query: string,
  variables: Record<string, unknown> = {},
): { data?: Record<string, unknown>; errors?: Array<{ message: string }> } {
  try {
    // Simple query parser (very basic, just for demo)
    const _operationMatch = query.match(/(query|mutation)\s+(\w+)/);
    // const operationType = operationMatch?.[1] ?? 'query'

    // Extract field names and args
    const fieldPattern = /(\w+)(?:\s*\(([^)]*)\))?/g;
    const bodyMatch = query.match(/\{([^}]+)\}/);

    if (!bodyMatch) {
      return { errors: [{ message: "Invalid query" }] };
    }

    const body = bodyMatch[1];
    const fields = [...body.matchAll(fieldPattern)]
      .map((m) => m[1])
      .filter((f) => f !== "__typename" && resolvers[f]);

    const data: Record<string, unknown> = {};

    for (const field of fields) {
      const resolver = resolvers[field];
      if (resolver) {
        data[field] = resolver(variables);
      }
    }

    return { data };
  } catch (error) {
    return {
      errors: [{ message: error instanceof Error ? error.message : "Unknown error" }],
    };
  }
}

/**
 * Create a mock fetch function for the GraphQL client.
 */
export function createMockFetch() {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 200));

    const body = init?.body ? JSON.parse(init.body as string) : {};
    const { query, variables } = body;

    const result = executeMock(query, variables);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

# pinia-colada-graphql

> **WIP**: This library is under active development and not yet published to npm. The API may change significantly.

> **Not Production Ready**: This is an experimental project. Use at your own risk in production environments.

GraphQL integration for [Pinia Colada](https://github.com/posva/pinia-colada) with Relay-style fragment colocation and normalized cache.

## Features

- Type-safe GraphQL queries and mutations
- Relay-style fragment colocation in Vue SFCs
- Data masking for component encapsulation
- Normalized cache with automatic updates
- Optimistic mutations
- Client interceptors for logging/monitoring

## Installation

```bash
# npm
npm install @pinia-colada-graphql/core @pinia/colada pinia graphql

# pnpm
pnpm add @pinia-colada-graphql/core @pinia/colada pinia graphql

# bun
bun add @pinia-colada-graphql/core @pinia/colada pinia graphql
```

For Vite projects with fragment colocation support:

```bash
npm install @pinia-colada-graphql/unplugin -D
```

## Quick Start

### 1. Configure the Plugin

```ts
// main.ts
import { createApp } from "vue";
import { createPinia } from "pinia";
import { PiniaColada } from "@pinia/colada";
import { PiniaColadaGraphQL } from "@pinia-colada-graphql/core";
import App from "./App.vue";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(PiniaColada);
app.use(PiniaColadaGraphQL, {
  client: {
    url: "/graphql",
  },
});

app.mount("#app");
```

### 2. Execute Queries

```vue
<script setup lang="ts">
import { useGraphQLQuery } from "@pinia-colada-graphql/core";
import { gql } from "@pinia-colada-graphql/tagged-template";

const GetUsersDocument = gql`
  query GetUsers {
    users {
      id
      name
      email
    }
  }
`;

const { data, isLoading, error, refetch } = useGraphQLQuery({
  document: GetUsersDocument,
});
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else-if="error">Error: {{ error.message }}</div>
  <ul v-else>
    <li v-for="user in data?.users" :key="user.id">
      {{ user.name }}
    </li>
  </ul>
</template>
```

### 3. Execute Mutations

```vue
<script setup lang="ts">
import { useGraphQLMutation } from "@pinia-colada-graphql/core";
import { gql } from "@pinia-colada-graphql/tagged-template";

const CreateUserDocument = gql`
  mutation CreateUser($name: String!, $email: String!) {
    createUser(name: $name, email: $email) {
      id
      name
      email
    }
  }
`;

const { mutate, isLoading } = useGraphQLMutation({
  document: CreateUserDocument,
  invalidateQueries: [["graphql", "GetUsers"]],
});

async function handleSubmit(name: string, email: string) {
  await mutate({ name, email });
}
</script>
```

## Fragment Colocation

Fragment colocation allows you to declare a component's data dependencies directly within the component file, similar to Relay.

### Setup

Configure the Vite plugin:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import graphql, { vueGraphQLBlock } from "@pinia-colada-graphql/unplugin/vite";

export default defineConfig({
  plugins: [
    vueGraphQLBlock(), // Must be before vue()
    vue(),
    graphql(),
  ],
});
```

### Usage

Define fragments in a `<script lang="graphql">` block within your Vue SFC:

```vue
<!-- UserCard.vue -->
<script lang="graphql">
fragment UserCard_user on User {
  name
  email
}
</script>

<script setup lang="ts">
import { useFragment } from "@pinia-colada-graphql/core";
import { UserCard_user, type UserCard_user$key } from "./UserCard.vue?graphql";

const props = defineProps<{
  userRef: UserCard_user$key;
}>();

const user = useFragment(UserCard_user, () => props.userRef);
</script>

<template>
  <div class="user-card">
    <div>{{ user?.name }}</div>
    <div>{{ user?.email }}</div>
  </div>
</template>
```

Use the fragment in a parent component:

```vue
<!-- UserList.vue -->
<script setup lang="ts">
import { useGraphQLQuery } from "@pinia-colada-graphql/core";
import { gql } from "@pinia-colada-graphql/tagged-template";
import UserCard from "./UserCard.vue";
import { UserCard_user } from "./UserCard.vue?graphql";

const GetUsersDocument = gql`
  query GetUsers {
    users {
      id
      __typename
      ...UserCard_user
    }
  }
  ${UserCard_user}
`;

const { data } = useGraphQLQuery({
  document: GetUsersDocument,
});
</script>

<template>
  <UserCard
    v-for="user in data?.users"
    :key="user.id"
    :user-ref="user"
  />
</template>
```

### Data Masking

With fragment colocation, parent components only receive the `id` and `__typename` fields needed to reference the entity. Child-specific fields like `name` and `email` are encapsulated within the child component through `useFragment`.

```
Parent Component          Child Component
┌─────────────────┐      ┌─────────────────┐
│ useGraphQLQuery │      │ useFragment     │
│                 │      │                 │
│ users: [        │      │ user:           │
│   { id,         │ ──── │   { name,       │
│     __typename }│  ref │     email }     │
│ ]               │      │                 │
└─────────────────┘      └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
           Normalized Cache
           (User:1, User:2...)
```

## API Reference

### useGraphQLQuery

Execute a GraphQL query with automatic caching.

```ts
const { data, isLoading, error, refetch } = useGraphQLQuery({
  document: MyQueryDocument,
  variables: { id: "1" },
  enabled: true,
  staleTime: 5000,
  gcTime: 300000,
});
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `document` | `TypedDocumentNode` | The GraphQL query document |
| `variables` | `MaybeRefOrGetter<Variables>` | Query variables (reactive) |
| `key` | `MaybeRefOrGetter<EntryKey>` | Custom cache key |
| `enabled` | `MaybeRefOrGetter<boolean>` | Whether the query is enabled |
| `staleTime` | `number` | Time in ms before data is considered stale |
| `gcTime` | `number` | Time in ms before inactive data is garbage collected |
| `transform` | `(data) => T` | Transform function for the response |
| `useNormalizedCache` | `boolean` | Whether to use normalized caching (default: `true`) |

### useGraphQLMutation

Execute a GraphQL mutation with optimistic updates support.

```ts
const { mutate, isLoading, error } = useGraphQLMutation({
  document: CreateUserDocument,
  optimisticResponse: (vars) => ({
    createUser: {
      id: "temp-id",
      __typename: "User",
      name: vars.name,
      email: vars.email,
    },
  }),
  invalidateQueries: [["graphql", "GetUsers"]],
  onSuccess: (data) => {
    console.log("User created:", data);
  },
});
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `document` | `TypedDocumentNode` | The GraphQL mutation document |
| `optimisticResponse` | `Response \| (vars) => Response` | Optimistic response for immediate UI updates |
| `invalidateQueries` | `EntryKey[]` | Query keys to invalidate after success |
| `refetchQueries` | `EntryKey[]` | Query keys to refetch after success |
| `onMutate` | `(vars) => Context` | Called before mutation executes |
| `onSuccess` | `(data, vars, context) => void` | Called on successful mutation |
| `onError` | `(error, vars, context) => void` | Called on mutation error |
| `onSettled` | `(data, error, vars, context) => void` | Called when mutation settles |

### useFragment

Read fragment data from the normalized cache with data masking.

```ts
const user = useFragment(UserCard_user, () => props.userRef);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `fragmentDoc` | `TypedFragmentNode` | The fragment document |
| `fragmentRef` | `MaybeRefOrGetter<FragmentRef>` | Reference to the entity |
| `options.throwOnMissing` | `boolean` | Throw if entity not found (default: `false`) |

### createGraphQLClient

Create a GraphQL client with interceptor support.

```ts
const client = createGraphQLClient({
  url: "/graphql",
  headers: {
    Authorization: `Bearer ${token}`,
  },
  interceptors: {
    onRequest: (ctx) => {
      console.log("Request:", ctx.operationName);
    },
    onResponse: (ctx) => {
      console.log("Response:", ctx.response);
      return ctx.response;
    },
    onError: (ctx) => {
      console.error("Error:", ctx.error);
      return ctx.error;
    },
  },
});
```

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `url` | `string` | GraphQL endpoint URL |
| `fetch` | `typeof fetch` | Custom fetch implementation |
| `headers` | `Headers \| (ctx) => Headers` | Request headers (static or dynamic) |
| `credentials` | `RequestCredentials` | Fetch credentials option |
| `interceptors.onRequest` | `(ctx) => void` | Called before each request |
| `interceptors.onResponse` | `(ctx) => Response` | Called after each response |
| `interceptors.onError` | `(ctx) => Error \| null` | Called on errors (return `null` to suppress) |
| `maxRetries` | `number` | Maximum retry attempts (default: `0`) |

### useNormalizedCache

Access the normalized cache store directly.

```ts
const cache = useNormalizedCache();

// Read an entity
const user = cache.readFragment<User>("User:1", UserFragment);

// Write to cache
cache.writeFragment("User:1", { name: "Updated Name" });

// Evict an entity
cache.evict("User:1");

// Clear entire cache
cache.clear();
```

## Type Policies

Customize how entities are identified and cached:

```ts
app.use(PiniaColadaGraphQL, {
  client: { url: "/graphql" },
  typePolicies: {
    User: {
      keyFields: ["id"],
    },
    Product: {
      keyFields: ["sku", "warehouse"],
    },
    Query: {
      fields: {
        user: {
          read: (existing, { args }) => {
            // Custom read logic
          },
        },
      },
    },
  },
});
```

## Vite Plugin Configuration

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import graphql, { vueGraphQLBlock } from "@pinia-colada-graphql/unplugin/vite";

export default defineConfig({
  plugins: [
    vueGraphQLBlock(), // Must be before vue() - handles <script lang="graphql">
    vue(),
    graphql({
      // Generate TypeScript types for fragments
      typescript: true,
    }),
  ],
});
```

The plugin:
- Extracts `<script lang="graphql">` blocks from Vue SFCs
- Generates TypeScript types for fragments
- Provides virtual module imports (`?graphql` suffix)

## Packages

| Package | Description |
|---------|-------------|
| `@pinia-colada-graphql/core` | Core library with composables and cache |
| `@pinia-colada-graphql/unplugin` | Vite/Webpack plugin for fragment colocation |
| `@pinia-colada-graphql/tagged-template` | Tagged template literal for GraphQL |

## Development

```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Run example
bun run dev

# Type check
bun run typecheck

# Lint
bun run lint
```

## License

MIT

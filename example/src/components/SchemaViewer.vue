<script setup lang="ts">
import { ref } from "vue";

const schema = `type Query {
  users: [User!]!
  user(id: ID!): User
  posts: [Post!]!
  post(id: ID!): Post
}

type Mutation {
  createUser(name: String!, email: String!): User!
  updateUser(id: ID!, name: String, email: String): User
  deleteUser(id: ID!): Boolean!
  createPost(title: String!, content: String!, authorId: ID!): Post!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
  createdAt: DateTime!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  createdAt: DateTime!
}

scalar DateTime`;

const expandedTypes = ref<Set<string>>(new Set(["Query", "Mutation"]));

function toggleType(typeName: string) {
  if (expandedTypes.value.has(typeName)) {
    expandedTypes.value.delete(typeName);
  } else {
    expandedTypes.value.add(typeName);
  }
  expandedTypes.value = new Set(expandedTypes.value);
}

interface TypeDef {
  kind: "type" | "scalar";
  name: string;
  fields?: { name: string; type: string; args?: string }[];
}

function parseSchema(schemaStr: string): TypeDef[] {
  const types: TypeDef[] = [];
  const typeRegex = /type\s+(\w+)\s*\{([^}]+)\}/g;
  const scalarRegex = /scalar\s+(\w+)/g;

  let match;
  while ((match = typeRegex.exec(schemaStr)) !== null) {
    const [, name, body] = match;
    const fields: TypeDef["fields"] = [];

    const fieldRegex = /(\w+)(\([^)]+\))?:\s*([^\n]+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const [, fieldName, args, fieldType] = fieldMatch;
      fields.push({
        name: fieldName,
        type: fieldType.trim(),
        args: args?.slice(1, -1),
      });
    }

    types.push({ kind: "type", name, fields });
  }

  while ((match = scalarRegex.exec(schemaStr)) !== null) {
    types.push({ kind: "scalar", name: match[1] });
  }

  return types;
}

const parsedTypes = parseSchema(schema);
</script>

<template>
  <div class="schema-viewer">
    <div class="panel-header">
      <div class="panel-title">
        <span class="mdi mdi-file-tree" />
        <span>Schema</span>
      </div>
    </div>

    <div class="schema-content">
      <div v-for="typeDef in parsedTypes" :key="typeDef.name" class="type-block">
        <div
          v-if="typeDef.kind === 'type'"
          class="type-header"
          @click="toggleType(typeDef.name)"
        >
          <span
            class="mdi"
            :class="
              expandedTypes.has(typeDef.name) ? 'mdi-chevron-down' : 'mdi-chevron-right'
            "
          />
          <span class="type-keyword">type</span>
          <span
            class="type-name"
            :class="{
              'type-name--root':
                typeDef.name === 'Query' || typeDef.name === 'Mutation',
            }"
          >
            {{ typeDef.name }}
          </span>
          <span class="type-count">{{ typeDef.fields?.length }} fields</span>
        </div>

        <div
          v-if="typeDef.kind === 'scalar'"
          class="type-header type-header--scalar"
        >
          <span class="mdi mdi-cube-outline" />
          <span class="type-keyword">scalar</span>
          <span class="type-name type-name--scalar">{{ typeDef.name }}</span>
        </div>

        <div
          v-if="typeDef.kind === 'type' && expandedTypes.has(typeDef.name)"
          class="type-fields"
        >
          <div v-for="field in typeDef.fields" :key="field.name" class="field-row">
            <span class="field-name">{{ field.name }}</span>
            <span v-if="field.args" class="field-args">({{ field.args }})</span>
            <span class="field-colon">:</span>
            <span class="field-type">{{ field.type }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.panel-title .mdi {
  font-size: 1rem;
  color: var(--color-graphql);
}

.schema-content {
  flex: 1;
  overflow: auto;
  padding: 0.75rem;
}

.type-block {
  margin-bottom: 2px;
}

.type-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: var(--color-surface-elevated);
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.type-header:hover {
  background: var(--color-border);
}

.type-header--scalar {
  cursor: default;
  opacity: 0.7;
}

.type-header--scalar:hover {
  background: var(--color-surface-elevated);
}

.type-header .mdi {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.type-keyword {
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  color: var(--color-accent-secondary);
}

.type-name {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.type-name--root {
  color: var(--color-graphql);
}

.type-name--scalar {
  color: var(--color-text-secondary);
}

.type-count {
  margin-left: auto;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.type-fields {
  margin-left: 1.25rem;
  padding: 0.25rem 0;
  border-left: 1px solid var(--color-border);
}

.field-row {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.field-name {
  color: var(--color-graphql);
}

.field-args {
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.field-colon {
  color: var(--color-text-muted);
}

.field-type {
  color: var(--color-pinia);
}
</style>

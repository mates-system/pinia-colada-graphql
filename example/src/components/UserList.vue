<script setup lang="ts">
import { ref } from "vue";
import { gql } from "@pinia-colada-graphql/tagged-template";
import { useGraphQLQuery, useGraphQLMutation } from "@pinia-colada-graphql/core";
import UserCard from "./UserCard.vue";
import { UserCard_user } from "./UserCard.vue?graphql";
import type {
  GetUsersQuery,
  CreateUserMutation,
  CreateUserMutation$variables,
} from "../graphql.d.ts";

const GetUsersDocument = gql`
  query GetUsers {
    users {
      id
      __typename
      ...UserCard_user
    }
  }
  ${UserCard_user}
` as GetUsersQuery;

const CreateUserDocument = gql`
  mutation CreateUser($name: String!, $email: String!) {
    createUser(name: $name, email: $email) {
      id
      __typename
      ...UserCard_user
    }
  }
  ${UserCard_user}
` as CreateUserMutation;

const { data, isLoading, error, refetch } = useGraphQLQuery({
  document: GetUsersDocument,
});

const { mutate: createUser, isLoading: isCreating } = useGraphQLMutation({
  document: CreateUserDocument,
  invalidateQueries: [["graphql", "GetUsers"]],
});

const newUserName = ref("");
const newUserEmail = ref("");

async function handleSubmit() {
  if (!newUserName.value || !newUserEmail.value) return;

  const variables: CreateUserMutation$variables = {
    name: newUserName.value,
    email: newUserEmail.value,
  };

  await createUser(variables);

  newUserName.value = "";
  newUserEmail.value = "";
}
</script>

<template>
  <div class="user-list">
    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="mdi mdi-account-group" />
          <h2>Users</h2>
        </div>
        <span class="section-badge">Fragment Colocation</span>
      </div>

      <div class="info-card">
        <div class="info-icon">
          <span class="mdi mdi-shield-lock-outline" />
        </div>
        <div class="info-content">
          <div class="info-title">Data Masking</div>
          <div class="info-desc">
            Parent components only access <code>id</code> and <code>__typename</code>.
            Child-specific fields like <code>name</code> and <code>email</code> are encapsulated.
          </div>
        </div>
      </div>

      <div class="toolbar">
        <button class="btn btn-secondary" @click="refetch()" :disabled="isLoading">
          <span class="mdi" :class="isLoading ? 'mdi-loading mdi-spin' : 'mdi-refresh'" />
          <span>{{ isLoading ? "Loading..." : "Refresh" }}</span>
        </button>
      </div>

      <div v-if="error" class="error-card">
        <span class="mdi mdi-alert-circle" />
        <span>{{ error.message }}</span>
      </div>

      <div v-if="isLoading && !data" class="loading-state">
        <span class="mdi mdi-loading mdi-spin" />
        <span>Loading users...</span>
      </div>

      <div v-else-if="data?.users?.length" class="user-grid">
        <UserCard v-for="user in data.users" :key="user.id" :user-ref="user" />
      </div>

      <div v-else class="empty-state">
        <span class="mdi mdi-account-off-outline" />
        <span>No users found</span>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="mdi mdi-account-plus" />
          <h2>Create User</h2>
        </div>
      </div>

      <form class="form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label" for="name">Name</label>
          <input
            id="name"
            v-model="newUserName"
            type="text"
            class="form-input"
            placeholder="Enter name"
            required
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="email">Email</label>
          <input
            id="email"
            v-model="newUserEmail"
            type="email"
            class="form-input"
            placeholder="Enter email"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="isCreating">
          <span class="mdi" :class="isCreating ? 'mdi-loading mdi-spin' : 'mdi-plus'" />
          <span>{{ isCreating ? "Creating..." : "Create User" }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.user-list {
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title .mdi {
  font-size: 1.25rem;
  color: var(--color-pinia);
}

.section-title h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
}

.section-badge {
  padding: 0.25rem 0.625rem;
  background: var(--color-surface-elevated);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-card {
  display: flex;
  gap: 0.875rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: var(--color-surface-elevated);
  border-radius: 8px;
  flex-shrink: 0;
}

.info-icon .mdi {
  font-size: 1.125rem;
  color: var(--color-pinia);
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
}

.info-desc {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.info-desc code {
  padding: 0.125rem 0.375rem;
  background: var(--color-surface-elevated);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-graphql);
}

.toolbar {
  display: flex;
  gap: 0.5rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn .mdi {
  font-size: 1rem;
}

.btn-primary {
  background: var(--color-graphql);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-graphql-dim);
}

.btn-secondary {
  background: var(--color-surface-elevated);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-border);
}

.error-card {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
  color: #fca5a5;
  font-size: 0.8125rem;
}

.error-card .mdi {
  color: var(--color-error);
}

.loading-state,
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.user-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.form-input {
  padding: 0.625rem 0.875rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.875rem;
  transition: all 0.15s ease;
}

.form-input::placeholder {
  color: var(--color-text-muted);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-graphql);
  box-shadow: 0 0 0 3px rgba(225, 0, 152, 0.1);
}

.mdi-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>

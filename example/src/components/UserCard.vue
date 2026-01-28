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
  <div v-if="user" class="user-card">
    <div class="user-avatar">
      <span class="mdi mdi-account" />
    </div>
    <div class="user-info">
      <div class="user-name">{{ user.name }}</div>
      <div class="user-email">{{ user.email }}</div>
    </div>
    <div class="user-badge">
      <span class="mdi mdi-check-circle" />
    </div>
  </div>
  <div v-else class="user-card user-card--loading">
    <div class="user-avatar user-avatar--loading">
      <span class="mdi mdi-account" />
    </div>
    <div class="user-info">
      <div class="skeleton skeleton--name" />
      <div class="skeleton skeleton--email" />
    </div>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.15s ease;
}

.user-card:hover {
  border-color: var(--color-border);
  background: var(--color-surface-elevated);
}

.user-card--loading {
  opacity: 0.6;
}

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--color-surface-elevated);
  border-radius: 8px;
  flex-shrink: 0;
}

.user-avatar .mdi {
  font-size: 1.25rem;
  color: var(--color-text-secondary);
}

.user-avatar--loading {
  background: var(--color-border);
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-badge {
  flex-shrink: 0;
}

.user-badge .mdi {
  font-size: 1rem;
  color: var(--color-success);
  opacity: 0.7;
}

.skeleton {
  background: var(--color-border);
  border-radius: 4px;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton--name {
  width: 120px;
  height: 16px;
}

.skeleton--email {
  width: 180px;
  height: 14px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>

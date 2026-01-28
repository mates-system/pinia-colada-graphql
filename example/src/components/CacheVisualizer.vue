<script setup lang="ts">
import { computed, ref } from "vue";
import { useNormalizedCache, type EntityId } from "@pinia-colada-graphql/core";

const cache = useNormalizedCache();
const selectedEntity = ref<EntityId | null>(null);

const entityIds = computed(() => cache.getEntityIds());

const groupedEntities = computed(() => {
  const groups: Record<string, EntityId[]> = {};

  for (const id of entityIds.value) {
    const [typename] = id.split(":");
    if (!groups[typename]) {
      groups[typename] = [];
    }
    groups[typename].push(id);
  }

  return groups;
});

const selectedEntityData = computed(() => {
  if (!selectedEntity.value) return null;
  return cache.getEntity(selectedEntity.value);
});

function selectEntity(id: EntityId) {
  selectedEntity.value = selectedEntity.value === id ? null : id;
}

function evictEntity(id: EntityId) {
  cache.evict(id);
  if (selectedEntity.value === id) {
    selectedEntity.value = null;
  }
}

function clearCache() {
  cache.clear();
  selectedEntity.value = null;
}
</script>

<template>
  <div class="cache-visualizer">
    <div class="panel-header">
      <div class="panel-title">
        <span class="mdi mdi-database" />
        <span>Cache Inspector</span>
      </div>
      <button class="btn-icon" @click="clearCache" title="Clear cache">
        <span class="mdi mdi-delete-outline" />
      </button>
    </div>

    <div class="stats-row">
      <div class="stat">
        <span class="stat-value">{{ entityIds.length }}</span>
        <span class="stat-label">Entities</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ Object.keys(groupedEntities).length }}</span>
        <span class="stat-label">Types</span>
      </div>
    </div>

    <div class="entity-list">
      <div v-if="entityIds.length === 0" class="empty-state">
        <span class="mdi mdi-database-off-outline" />
        <span>Cache is empty</span>
      </div>

      <div v-for="(ids, typename) in groupedEntities" :key="typename" class="type-group">
        <div class="type-header">
          <span class="type-icon mdi mdi-code-braces" />
          <span class="type-name">{{ typename }}</span>
          <span class="type-count">{{ ids.length }}</span>
        </div>
        <div class="type-entities">
          <div
            v-for="id in ids"
            :key="id"
            class="entity-item"
            :class="{ 'entity-item--selected': selectedEntity === id }"
            @click="selectEntity(id)"
          >
            <span class="entity-id">{{ id }}</span>
            <button class="btn-icon btn-icon--small" @click.stop="evictEntity(id)" title="Evict">
              <span class="mdi mdi-close" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedEntityData" class="detail-panel">
      <div class="detail-header">
        <span class="detail-title">{{ selectedEntity }}</span>
        <button class="btn-icon btn-icon--small" @click="selectedEntity = null">
          <span class="mdi mdi-close" />
        </button>
      </div>
      <pre class="detail-json">{{ JSON.stringify(selectedEntityData, null, 2) }}</pre>
    </div>
  </div>
</template>

<style scoped>
.cache-visualizer {
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
  color: var(--color-pinia);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-icon:hover {
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

.btn-icon .mdi {
  font-size: 1rem;
}

.btn-icon--small {
  width: 22px;
  height: 22px;
}

.btn-icon--small .mdi {
  font-size: 0.875rem;
}

.stats-row {
  display: flex;
  gap: 1rem;
  padding: 0.875rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}

.stat {
  display: flex;
  align-items: baseline;
  gap: 0.375rem;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  font-variant-numeric: tabular-nums;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: lowercase;
}

.entity-list {
  flex: 1;
  overflow: auto;
  padding: 0.75rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.empty-state .mdi {
  font-size: 1.5rem;
  opacity: 0.5;
}

.type-group {
  margin-bottom: 0.75rem;
}

.type-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.type-icon {
  font-size: 0.875rem;
  color: var(--color-pinia);
}

.type-name {
  font-weight: 500;
}

.type-count {
  margin-left: auto;
  padding: 0.125rem 0.375rem;
  background: var(--color-surface-elevated);
  border-radius: 4px;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
}

.type-entities {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.entity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.625rem;
  background: var(--color-surface-elevated);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.entity-item:hover {
  background: var(--color-border);
}

.entity-item--selected {
  background: rgba(255, 216, 89, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 216, 89, 0.3);
}

.entity-id {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.entity-item--selected .entity-id {
  color: var(--color-text);
}

.detail-panel {
  border-top: 1px solid var(--color-border);
  max-height: 200px;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.detail-title {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-pinia);
}

.detail-json {
  flex: 1;
  overflow: auto;
  padding: 0.75rem 1rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.6875rem;
  line-height: 1.6;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>

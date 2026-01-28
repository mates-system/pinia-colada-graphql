<script setup lang="ts">
import { ref, computed } from "vue";
import { getQueryLog, type QueryLogEntry } from "../stores/query-log";

const { entries, clearEntries } = getQueryLog();
const selectedEntry = ref<QueryLogEntry | null>(null);
const filter = ref<"all" | "query" | "mutation">("all");
const activeDetailTab = ref<"query" | "variables" | "response">("query");

const filteredEntries = computed(() => {
  if (filter.value === "all") return entries.value;
  return entries.value.filter((e) => e.type === filter.value);
});

function selectEntry(entry: QueryLogEntry) {
  selectedEntry.value = selectedEntry.value?.id === entry.id ? null : entry;
  activeDetailTab.value = "query";
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number | null): string {
  if (ms === null) return "...";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

const detailContent = computed(() => {
  if (!selectedEntry.value) return "";
  if (activeDetailTab.value === "query") {
    return selectedEntry.value.document;
  }
  if (activeDetailTab.value === "variables") {
    return JSON.stringify(selectedEntry.value.variables, null, 2);
  }
  if (activeDetailTab.value === "response") {
    if (selectedEntry.value.error) {
      return `Error: ${selectedEntry.value.error}`;
    }
    return JSON.stringify(selectedEntry.value.response, null, 2);
  }
  return "";
});
</script>

<template>
  <div class="query-log">
    <div class="panel-header">
      <div class="panel-title">
        <span class="mdi mdi-history" />
        <span>Query Log</span>
      </div>
      <div class="header-actions">
        <select v-model="filter" class="filter-select">
          <option value="all">All</option>
          <option value="query">Queries</option>
          <option value="mutation">Mutations</option>
        </select>
        <button class="btn-icon" @click="clearEntries()" title="Clear log">
          <span class="mdi mdi-delete-outline" />
        </button>
      </div>
    </div>

    <div class="log-list">
      <div v-if="filteredEntries.length === 0" class="empty-state">
        <span class="mdi mdi-history" />
        <span>No queries yet</span>
      </div>

      <div
        v-for="entry in filteredEntries"
        :key="entry.id"
        class="log-entry"
        :class="{
          'log-entry--selected': selectedEntry?.id === entry.id,
          'log-entry--pending': entry.status === 'pending',
          'log-entry--error': entry.status === 'error',
        }"
        @click="selectEntry(entry)"
      >
        <div class="entry-header">
          <span
            class="entry-type"
            :class="{
              'entry-type--query': entry.type === 'query',
              'entry-type--mutation': entry.type === 'mutation',
            }"
          >
            {{ entry.type.charAt(0).toUpperCase() }}
          </span>
          <span class="entry-name">{{ entry.operationName || "Anonymous" }}</span>
          <span class="entry-status">
            <span
              v-if="entry.status === 'pending'"
              class="mdi mdi-loading mdi-spin"
            />
            <span
              v-else-if="entry.status === 'success'"
              class="mdi mdi-check-circle status-success"
            />
            <span v-else class="mdi mdi-alert-circle status-error" />
          </span>
        </div>
        <div class="entry-meta">
          <span class="entry-time">{{ formatTime(entry.timestamp) }}</span>
          <span class="entry-duration">{{ formatDuration(entry.duration) }}</span>
        </div>
      </div>
    </div>

    <div v-if="selectedEntry" class="detail-panel">
      <div class="detail-header">
        <div class="detail-tabs">
          <button
            class="detail-tab"
            :class="{ 'detail-tab--active': activeDetailTab === 'query' }"
            @click="activeDetailTab = 'query'"
          >
            <span class="mdi mdi-code-braces" />
            Query
          </button>
          <button
            v-if="selectedEntry.variables && Object.keys(selectedEntry.variables).length > 0"
            class="detail-tab"
            :class="{ 'detail-tab--active': activeDetailTab === 'variables' }"
            @click="activeDetailTab = 'variables'"
          >
            <span class="mdi mdi-code-json" />
            Variables
          </button>
          <button
            v-if="selectedEntry.response || selectedEntry.error"
            class="detail-tab"
            :class="{ 'detail-tab--active': activeDetailTab === 'response' }"
            @click="activeDetailTab = 'response'"
          >
            <span class="mdi mdi-arrow-left-bold" />
            Response
          </button>
        </div>
        <button class="btn-icon btn-icon--small" @click="selectedEntry = null">
          <span class="mdi mdi-close" />
        </button>
      </div>
      <pre class="detail-content" :class="{ 'detail-content--error': activeDetailTab === 'response' && selectedEntry.error }">{{ detailContent }}</pre>
    </div>
  </div>
</template>

<style scoped>
.query-log {
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.filter-select {
  padding: 0.25rem 0.5rem;
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
}

.filter-select:focus {
  outline: none;
  border-color: var(--color-graphql);
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

.log-list {
  flex: 1;
  overflow: auto;
  padding: 0.5rem;
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

.log-entry {
  padding: 0.625rem 0.75rem;
  background: var(--color-surface-elevated);
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.log-entry:hover {
  background: var(--color-border);
}

.log-entry--selected {
  background: rgba(225, 0, 152, 0.12);
  box-shadow: inset 0 0 0 1px rgba(225, 0, 152, 0.3);
}

.log-entry--pending {
  opacity: 0.7;
}

.log-entry--error {
  background: rgba(239, 68, 68, 0.1);
}

.entry-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.entry-type {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 4px;
  font-size: 0.625rem;
  font-weight: 700;
  flex-shrink: 0;
}

.entry-type--query {
  background: rgba(255, 216, 89, 0.2);
  color: var(--color-pinia);
}

.entry-type--mutation {
  background: rgba(225, 0, 152, 0.2);
  color: var(--color-graphql);
}

.entry-name {
  flex: 1;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entry-status .mdi {
  font-size: 0.875rem;
}

.status-success {
  color: var(--color-success);
}

.status-error {
  color: var(--color-error);
}

.entry-meta {
  display: flex;
  gap: 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.detail-panel {
  border-top: 1px solid var(--color-border);
  min-height: 180px;
  max-height: 50%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.detail-tabs {
  display: flex;
  gap: 4px;
}

.detail-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.detail-tab .mdi {
  font-size: 0.875rem;
}

.detail-tab:hover {
  color: var(--color-text-secondary);
  background: var(--color-surface-elevated);
}

.detail-tab--active {
  background: var(--color-graphql);
  color: white;
}

.detail-tab--active:hover {
  background: var(--color-graphql);
  color: white;
}

.btn-icon--small {
  width: 24px;
  height: 24px;
}

.btn-icon--small .mdi {
  font-size: 0.875rem;
}

.detail-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-bg);
}

.detail-content--error {
  color: var(--color-error);
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

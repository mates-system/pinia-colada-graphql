<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import CacheVisualizer from "./components/CacheVisualizer.vue";
import QueryLog from "./components/QueryLog.vue";
import SchemaViewer from "./components/SchemaViewer.vue";
import UserList from "./components/UserList.vue";

type SidebarTab = "cache" | "queries" | "schema";

const showSidebar = ref(true);
const activeTab = ref<SidebarTab>("cache");
const sidebarWidth = ref(380);
const isResizing = ref(false);

function startResize(e: MouseEvent) {
  isResizing.value = true;
  e.preventDefault();
}

function onMouseMove(e: MouseEvent) {
  if (!isResizing.value) return;
  const newWidth = window.innerWidth - e.clientX;
  sidebarWidth.value = Math.max(200, Math.min(window.innerWidth - 200, newWidth));
}

function onMouseUp() {
  isResizing.value = false;
}

onMounted(() => {
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
});

onUnmounted(() => {
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mouseup", onMouseUp);
});
</script>

<template>
  <div class="app" :class="{ 'app--resizing': isResizing }">
    <header class="header">
      <div class="header-left">
        <div class="logo">
          <span class="logo-icon mdi mdi-graphql" />
          <div class="logo-text">
            <span class="logo-title">Pinia Colada</span>
            <span class="logo-subtitle">GraphQL</span>
          </div>
        </div>
        <div class="header-divider" />
        <span class="header-label">Playground</span>
      </div>
      <div class="header-right">
        <a
          href="https://github.com/your-org/pinia-colada-graphql"
          target="_blank"
          class="header-link"
        >
          <span class="mdi mdi-github" />
          <span>GitHub</span>
        </a>
        <button class="header-btn" @click="showSidebar = !showSidebar">
          <span class="mdi" :class="showSidebar ? 'mdi-dock-right' : 'mdi-dock-right'" />
          <span>{{ showSidebar ? "Hide" : "Show" }} Panel</span>
        </button>
      </div>
    </header>

    <main class="main">
      <div class="content">
        <UserList />
      </div>

      <div
        v-if="showSidebar"
        class="resize-handle"
        @mousedown="startResize"
      />

      <aside
        v-if="showSidebar"
        class="sidebar"
        :style="{ width: `${sidebarWidth}px` }"
      >
        <div class="sidebar-tabs">
          <button
            class="sidebar-tab"
            :class="{ 'sidebar-tab--active': activeTab === 'cache' }"
            @click="activeTab = 'cache'"
          >
            <span class="mdi mdi-database" />
            <span>Cache</span>
          </button>
          <button
            class="sidebar-tab"
            :class="{ 'sidebar-tab--active': activeTab === 'queries' }"
            @click="activeTab = 'queries'"
          >
            <span class="mdi mdi-history" />
            <span>Queries</span>
          </button>
          <button
            class="sidebar-tab"
            :class="{ 'sidebar-tab--active': activeTab === 'schema' }"
            @click="activeTab = 'schema'"
          >
            <span class="mdi mdi-file-tree" />
            <span>Schema</span>
          </button>
        </div>

        <div class="sidebar-content">
          <CacheVisualizer v-if="activeTab === 'cache'" />
          <QueryLog v-else-if="activeTab === 'queries'" />
          <SchemaViewer v-else-if="activeTab === 'schema'" />
        </div>
      </aside>
    </main>

    <footer class="footer">
      <span>Built with Vue 3 + Pinia Colada</span>
      <span class="footer-divider">|</span>
      <span>Normalized Cache + Fragment Colocation</span>
    </footer>
  </div>
</template>

<style>
:root {
  --color-bg: #0a0a0b;
  --color-surface: #111113;
  --color-surface-elevated: #18181b;
  --color-border: #27272a;
  --color-border-subtle: #1f1f22;
  --color-text: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
  /* Pinia yellow */
  --color-pinia: #ffd859;
  --color-pinia-dim: #d4a843;
  /* GraphQL pink */
  --color-graphql: #e10098;
  --color-graphql-dim: #b8007d;
  /* Accent defaults to Pinia */
  --color-accent: var(--color-pinia);
  --color-accent-secondary: var(--color-graphql);
  --color-success: #22c55e;
  --color-warning: #eab308;
  --color-error: #ef4444;
  --font-mono: "JetBrains Mono", "SF Mono", "Fira Code", monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app--resizing {
  cursor: ew-resize;
  user-select: none;
}

.app--resizing * {
  pointer-events: none;
}

.app--resizing .resize-handle {
  pointer-events: auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1.5rem;
  height: 60px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.logo-icon {
  font-size: 1.75rem;
  color: var(--color-graphql);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.logo-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-pinia);
}

.logo-subtitle {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-graphql);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.header-divider {
  width: 1px;
  height: 24px;
  background: var(--color-border);
}

.header-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.header-link:hover {
  color: var(--color-text);
  background: var(--color-surface-elevated);
}

.header-link .mdi {
  font-size: 1.125rem;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: var(--color-surface-elevated);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  transition: all 0.15s ease;
}

.header-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border);
  background: var(--color-border);
}

.header-btn .mdi {
  font-size: 1rem;
}

.main {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.content {
  flex: 1;
  padding: 2rem;
  overflow: auto;
}

.resize-handle {
  width: 4px;
  background: transparent;
  cursor: ew-resize;
  transition: background 0.15s ease;
  position: relative;
  z-index: 10;
}

.resize-handle::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: -4px;
  right: -4px;
}

.resize-handle:hover,
.app--resizing .resize-handle {
  background: var(--color-accent);
}

.sidebar {
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-tabs {
  display: flex;
  padding: 0.5rem;
  gap: 4px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.sidebar-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-tab:hover {
  color: var(--color-text-secondary);
  background: var(--color-surface-elevated);
}

.sidebar-tab--active {
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

.sidebar-tab .mdi {
  font-size: 0.875rem;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.footer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.footer-divider {
  color: var(--color-border);
}

@media (max-width: 900px) {
  .main {
    flex-direction: column;
  }

  .resize-handle {
    display: none;
  }

  .sidebar {
    width: 100% !important;
    border-left: none;
    border-top: 1px solid var(--color-border);
    max-height: 400px;
  }

  .header-label {
    display: none;
  }
}
</style>

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import graphql, { vueGraphQLBlock } from "@pinia-colada-graphql/unplugin/vite";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/pinia-colada-graphql/" : "/",
  plugins: [vueGraphQLBlock(), vue(), graphql()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  optimizeDeps: {
    // Disable dependency scanning for now (Vite 8 beta + rolldown issue)
    noDiscovery: true,
  },
}));

import { unplugin } from "./core";
import { vueGraphQLBlock } from "./vue-graphql-block";
import type { GraphQLUnpluginOptions } from "./types";
import type { VueGraphQLBlockOptions } from "./vue-graphql-block";

/**
 * Vite plugin for GraphQL file loading.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import vue from '@vitejs/plugin-vue'
 * import graphql from '@pinia-colada-graphql/unplugin/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     vue(),
 *     graphql({
 *       // options
 *     }),
 *   ],
 * })
 * ```
 */
export default (options: GraphQLUnpluginOptions = {}) => unplugin.vite(options);

export { vueGraphQLBlock };
export type { GraphQLUnpluginOptions, VueGraphQLBlockOptions };

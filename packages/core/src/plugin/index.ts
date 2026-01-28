import type { App, Plugin } from "vue";
import type { Pinia } from "pinia";
import { GRAPHQL_CLIENT_KEY, createGraphQLClient, type GraphQLClientOptions } from "../client";
import { useNormalizedCache, type TypePolicies } from "../cache";

/**
 * Options for the PiniaColadaGraphQL plugin.
 */
export interface PiniaColadaGraphQLOptions {
  /**
   * Pinia instance to use.
   */
  pinia?: Pinia;

  /**
   * GraphQL client options or a pre-created client.
   */
  client: GraphQLClientOptions | ReturnType<typeof createGraphQLClient>;

  /**
   * Type policies for the normalized cache.
   */
  typePolicies?: TypePolicies;
}

/**
 * Vue plugin that installs the GraphQL integration for Pinia Colada.
 *
 * @example
 * ```ts
 * import { createApp } from 'vue'
 * import { createPinia } from 'pinia'
 * import { PiniaColada } from '@pinia/colada'
 * import { PiniaColadaGraphQL } from '@pinia-colada-graphql/core'
 *
 * const app = createApp(App)
 * const pinia = createPinia()
 *
 * app.use(pinia)
 * app.use(PiniaColada)
 * app.use(PiniaColadaGraphQL, {
 *   client: {
 *     url: '/graphql',
 *   },
 *   typePolicies: {
 *     User: {
 *       keyFields: ['id'],
 *     },
 *   },
 * })
 * ```
 */
export const PiniaColadaGraphQL: Plugin<[PiniaColadaGraphQLOptions]> = {
  install(app: App, options: PiniaColadaGraphQLOptions) {
    const {
      pinia = app.config.globalProperties.$pinia,
      client: clientOptions,
      typePolicies,
    } = options;

    // Create or use the client
    const client = "execute" in clientOptions ? clientOptions : createGraphQLClient(clientOptions);

    // Provide the client
    app.provide(GRAPHQL_CLIENT_KEY, client);

    if (process.env.NODE_ENV !== "production" && !pinia) {
      throw new Error(
        "[@pinia-colada-graphql] Pinia plugin not detected. " +
          "Make sure to install pinia before installing PiniaColadaGraphQL.",
      );
    }

    // Initialize the normalized cache and set type policies
    const cache = useNormalizedCache(pinia);
    if (typePolicies) {
      cache.setTypePolicies(typePolicies);
    }
  },
};

import { inject, type InjectionKey } from "vue";
import type { GraphQLClient } from "./types";

/**
 * Injection key for the GraphQL client.
 */
export const GRAPHQL_CLIENT_KEY: InjectionKey<GraphQLClient> = Symbol("graphql-client");

/**
 * Use the injected GraphQL client.
 * Must be called within a component setup or injection context.
 */
export function useGraphQLClient(): GraphQLClient {
  const client = inject(GRAPHQL_CLIENT_KEY);

  if (!client) {
    throw new Error(
      "[@pinia-colada-graphql] GraphQL client not found. " +
        "Make sure to install PiniaColadaGraphQL plugin with a client.",
    );
  }

  return client;
}

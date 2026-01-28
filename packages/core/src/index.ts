/**
 * @pinia-colada-graphql/core
 *
 * GraphQL integration for Pinia Colada with normalized cache.
 */

// Types
export type {
  TypedDocumentNode,
  ResultOf,
  VariablesOf,
  TypedFragmentNode,
  FragmentRef,
  FragmentDataOf,
  FragmentNameOf,
  FragmentType,
  UnmaskFragment,
  IsFragmentRef,
  MaskFragmentFields,
} from "./types";

// Client
export {
  createGraphQLClient,
  useGraphQLClient,
  GraphQLClientError,
  GRAPHQL_CLIENT_KEY,
} from "./client";

export type {
  GraphQLClient,
  GraphQLClientOptions,
  GraphQLError,
  GraphQLRequestOptions,
  GraphQLResponse,
  HeadersContext,
  HeadersFunction,
} from "./client";

// Cache
export {
  useNormalizedCache,
  NORMALIZED_CACHE_STORE_ID,
  normalize,
  denormalize,
  getEntityId,
  toEntityRef,
  isEntity,
  isEntityRef,
} from "./cache";

export type {
  NormalizedCache,
  NormalizedCacheOptions,
  EntityId,
  EntityRef,
  StoredEntity,
  TypePolicies,
  TypePolicy,
  FieldPolicy,
  FieldPolicies,
  OptimisticLayer,
} from "./cache";

// Composables
export {
  useGraphQLQuery,
  useGraphQLMutation,
  useFragment,
  makeFragmentRef,
  isFragmentRef,
} from "./composables";

export type {
  UseGraphQLQueryOptions,
  UseGraphQLQueryReturn,
  UseGraphQLMutationOptions,
  UseGraphQLMutationReturn,
  UseFragmentOptions,
} from "./composables";

// Plugin
export { PiniaColadaGraphQL } from "./plugin";
export type { PiniaColadaGraphQLOptions } from "./plugin";

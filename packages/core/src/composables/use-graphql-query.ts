import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery, type UseQueryReturn, type EntryKey } from "@pinia/colada";
import type { TypedDocumentNode, ResultOf, VariablesOf } from "../types";
import { useGraphQLClient } from "../client";
import { useNormalizedCache } from "../cache";

/**
 * Options for useGraphQLQuery.
 */
export interface UseGraphQLQueryOptions<
  TDocument extends TypedDocumentNode<unknown, unknown>,
  TData = ResultOf<TDocument>,
> {
  /**
   * The GraphQL document to execute.
   */
  document: TDocument;

  /**
   * Variables for the query.
   */
  variables?: MaybeRefOrGetter<VariablesOf<TDocument>>;

  /**
   * Unique key for caching. Defaults to a key based on the document and variables.
   */
  key?: MaybeRefOrGetter<EntryKey>;

  /**
   * Whether the query is enabled.
   */
  enabled?: MaybeRefOrGetter<boolean>;

  /**
   * Time in ms after which the data is considered stale.
   */
  staleTime?: number;

  /**
   * Time in ms after which inactive queries are garbage collected.
   */
  gcTime?: number;

  /**
   * Transform the data before storing.
   */
  transform?: (data: ResultOf<TDocument>) => TData;

  /**
   * Whether to use the normalized cache.
   */
  useNormalizedCache?: boolean;
}

/**
 * Return type of useGraphQLQuery.
 */
export type UseGraphQLQueryReturn<TData> = UseQueryReturn<TData, Error>;

/**
 * Extract the operation name from a document.
 */
function getOperationName(document: TypedDocumentNode<unknown, unknown>): string | null {
  for (const definition of document.definitions) {
    if (definition.kind === "OperationDefinition" && definition.name) {
      return definition.name.value;
    }
  }
  return null;
}

/**
 * Execute a GraphQL query using pinia-colada.
 *
 * @example
 * ```ts
 * // With explicit data type
 * const { data } = useGraphQLQuery<MyQueryData>({
 *   document: MyQuery,
 * })
 *
 * // With document type inference
 * const { data } = useGraphQLQuery({
 *   document: MyTypedQuery, // TypedDocumentNode<MyData, MyVars>
 * })
 * ```
 */
export function useGraphQLQuery<TData>(
  options: UseGraphQLQueryOptions<TypedDocumentNode<TData, unknown>, TData>,
): UseGraphQLQueryReturn<TData>;
export function useGraphQLQuery<
  TDocument extends TypedDocumentNode<unknown, unknown>,
  TData = ResultOf<TDocument>,
>(options: UseGraphQLQueryOptions<TDocument, TData>): UseGraphQLQueryReturn<TData>;
export function useGraphQLQuery<
  TDocument extends TypedDocumentNode<unknown, unknown>,
  TData = ResultOf<TDocument>,
>(options: UseGraphQLQueryOptions<TDocument, TData>): UseGraphQLQueryReturn<TData> {
  const client = useGraphQLClient();
  const cache = useNormalizedCache();

  const {
    document,
    variables,
    key,
    enabled,
    staleTime,
    gcTime,
    transform,
    useNormalizedCache: useCache = true,
  } = options;

  const operationName = getOperationName(document);

  // Build cache key
  const queryKey = computed((): EntryKey => {
    if (key) {
      return toValue(key);
    }
    const vars = toValue(variables);
    return ["graphql", operationName || "anonymous", vars ?? {}] as EntryKey;
  });

  return useQuery({
    key: () => queryKey.value as EntryKey,
    enabled: enabled != null ? () => toValue(enabled) : undefined,
    staleTime,
    gcTime,

    async query({ signal }) {
      const vars = toValue(variables) as VariablesOf<TDocument>;

      const response = await client.execute(document, {
        variables: vars,
        signal,
        operationName: operationName ?? undefined,
      });

      if (response.errors?.length) {
        const errorMessages = response.errors.map((e) => e.message).join(", ");
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }

      if (response.data === undefined) {
        throw new Error("No data returned from GraphQL query");
      }

      const data = response.data as ResultOf<TDocument>;

      // Write to normalized cache
      if (useCache) {
        cache.write(data, document, vars as Record<string, unknown>);
      }

      // Apply transform if provided
      if (transform) {
        return transform(data);
      }

      return data as unknown as TData;
    },
  });
}

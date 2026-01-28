import { toValue, type MaybeRefOrGetter } from "vue";
import { useMutation, useQueryCache, type UseMutationReturn, type EntryKey } from "@pinia/colada";
import type { TypedDocumentNode, ResultOf, VariablesOf } from "../types";
import { useGraphQLClient } from "../client";
import { useNormalizedCache } from "../cache";

/**
 * Options for useGraphQLMutation.
 */
export interface UseGraphQLMutationOptions<
  TDocument extends TypedDocumentNode<unknown, unknown>,
  TData = ResultOf<TDocument>,
  TContext = unknown,
> {
  /**
   * The GraphQL mutation document.
   */
  document: TDocument;

  /**
   * Transform the data before storing.
   */
  transform?: (data: ResultOf<TDocument>) => TData;

  /**
   * Whether to use the normalized cache.
   */
  useNormalizedCache?: boolean;

  /**
   * Optimistic response to apply before the mutation completes.
   */
  optimisticResponse?:
    | ResultOf<TDocument>
    | ((variables: VariablesOf<TDocument>) => ResultOf<TDocument>);

  /**
   * Called before the mutation is executed.
   */
  onMutate?: (variables: VariablesOf<TDocument>) => TContext | Promise<TContext>;

  /**
   * Called when the mutation succeeds.
   */
  onSuccess?: (
    data: TData,
    variables: VariablesOf<TDocument>,
    context: TContext | undefined,
  ) => void | Promise<void>;

  /**
   * Called when the mutation fails.
   */
  onError?: (
    error: Error,
    variables: VariablesOf<TDocument>,
    context: TContext | undefined,
  ) => void | Promise<void>;

  /**
   * Called when the mutation settles (success or error).
   */
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: VariablesOf<TDocument>,
    context: TContext | undefined,
  ) => void | Promise<void>;

  /**
   * Query keys to refetch after the mutation succeeds.
   */
  refetchQueries?: MaybeRefOrGetter<EntryKey[]>;

  /**
   * Query keys to invalidate after the mutation succeeds.
   */
  invalidateQueries?: MaybeRefOrGetter<EntryKey[]>;
}

/**
 * Return type of useGraphQLMutation.
 */
export type UseGraphQLMutationReturn<TData, TVars> = UseMutationReturn<TData, TVars, Error>;

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

let optimisticIdCounter = 0;

/**
 * Execute a GraphQL mutation using pinia-colada.
 *
 * @example
 * ```ts
 * // With explicit types
 * const { mutate } = useGraphQLMutation<MyMutationData, MyMutationVars>({
 *   document: MyMutation,
 * })
 *
 * // With document type inference
 * const { mutate } = useGraphQLMutation({
 *   document: MyTypedMutation, // TypedDocumentNode<MyData, MyVars>
 * })
 * ```
 */
export function useGraphQLMutation<TData, TVars>(
  options: UseGraphQLMutationOptions<TypedDocumentNode<TData, TVars>, TData>,
): UseGraphQLMutationReturn<TData, TVars>;
export function useGraphQLMutation<
  TDocument extends TypedDocumentNode<unknown, unknown>,
  TData = ResultOf<TDocument>,
  TContext = unknown,
>(
  options: UseGraphQLMutationOptions<TDocument, TData, TContext>,
): UseGraphQLMutationReturn<TData, VariablesOf<TDocument>>;
export function useGraphQLMutation<
  TDocument extends TypedDocumentNode<unknown, unknown>,
  TData = ResultOf<TDocument>,
  TContext = unknown,
>(
  options: UseGraphQLMutationOptions<TDocument, TData, TContext>,
): UseGraphQLMutationReturn<TData, VariablesOf<TDocument>> {
  const client = useGraphQLClient();
  const cache = useNormalizedCache();
  const queryCache = useQueryCache();

  const {
    document,
    transform,
    useNormalizedCache: useCache = true,
    optimisticResponse,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    refetchQueries,
    invalidateQueries,
  } = options;

  const operationName = getOperationName(document);

  return useMutation({
    async mutation(variables: VariablesOf<TDocument>) {
      const response = await client.execute(document, {
        variables,
        operationName: operationName ?? undefined,
      });

      if (response.errors?.length) {
        const errorMessages = response.errors.map((e) => e.message).join(", ");
        throw new Error(`GraphQL Error: ${errorMessages}`);
      }

      if (response.data === undefined) {
        throw new Error("No data returned from GraphQL mutation");
      }

      const data = response.data as ResultOf<TDocument>;

      // Write to normalized cache
      if (useCache) {
        cache.write(data, document, variables as Record<string, unknown>);
      }

      // Apply transform if provided
      if (transform) {
        return transform(data);
      }

      return data as unknown as TData;
    },

    async onMutate(variables) {
      let context: TContext | undefined;
      let layerId: string | undefined;

      // Apply optimistic response
      if (optimisticResponse) {
        const response =
          typeof optimisticResponse === "function"
            ? (optimisticResponse as (variables: VariablesOf<TDocument>) => ResultOf<TDocument>)(
                variables,
              )
            : optimisticResponse;

        layerId = `optimistic-${++optimisticIdCounter}`;
        cache.addOptimisticLayer(layerId, response);
      }

      // Call user's onMutate
      if (onMutate) {
        context = await onMutate(variables);
      }

      return { context, layerId } as unknown as TContext & { layerId?: string };
    },

    async onSuccess(data, variables, context) {
      const ctx = context as (TContext & { layerId?: string }) | undefined;

      // Remove optimistic layer
      if (ctx?.layerId) {
        cache.removeOptimisticLayer(ctx.layerId);
      }

      // Call user's onSuccess
      if (onSuccess) {
        await onSuccess(data, variables, ctx as TContext | undefined);
      }

      // Refetch queries
      const refetch = toValue(refetchQueries);
      if (refetch) {
        await Promise.all(
          refetch.map((key) =>
            queryCache.invalidateQueries({
              key,
              exact: true,
            }),
          ),
        );
      }

      // Invalidate queries
      const invalidate = toValue(invalidateQueries);
      if (invalidate) {
        await Promise.all(
          invalidate.map((key) =>
            queryCache.invalidateQueries({
              key,
              exact: false,
            }),
          ),
        );
      }
    },

    async onError(error, variables, context) {
      const ctx = context as (TContext & { layerId?: string }) | undefined;

      // Remove optimistic layer on error (rollback)
      if (ctx?.layerId) {
        cache.removeOptimisticLayer(ctx.layerId);
      }

      // Call user's onError
      if (onError) {
        await onError(error, variables, ctx as TContext | undefined);
      }
    },

    async onSettled(data, error, variables, context) {
      const ctx = context as TContext | undefined;

      // Call user's onSettled
      if (onSettled) {
        await onSettled(data, error ?? null, variables, ctx);
      }
    },
  });
}

import type { DocumentNode } from "graphql";

/**
 * A typed document node that carries type information for the result and variables.
 * This is compatible with TypedDocumentNode from @graphql-typed-document-node/core.
 */
export interface TypedDocumentNode<
  TResult = Record<string, unknown>,
  TVariables = Record<string, unknown>,
> extends DocumentNode {
  /**
   * Marker for the result type. This property doesn't exist at runtime.
   */
  __apiType?: (variables: TVariables) => TResult;
  /**
   * Marker for the variables type. This property doesn't exist at runtime.
   */
  __resultType?: TResult;
  /**
   * Marker for the variables type. This property doesn't exist at runtime.
   */
  __variablesType?: TVariables;
}

/**
 * Extract the result type from a TypedDocumentNode.
 */
export type ResultOf<T> = T extends TypedDocumentNode<infer TResult, unknown> ? TResult : never;

/**
 * Extract the variables type from a TypedDocumentNode.
 */
export type VariablesOf<T> =
  T extends TypedDocumentNode<unknown, infer TVariables> ? TVariables : never;

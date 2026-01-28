import type { DocumentNode } from "graphql";

/**
 * A typed document node that carries type information for the result and variables.
 */
export interface TypedDocumentNode<
  TResult = Record<string, unknown>,
  TVariables = Record<string, unknown>,
> extends DocumentNode {
  /** Type marker for result */
  readonly __resultType?: TResult;
  /** Type marker for variables */
  readonly __variablesType?: TVariables;
}

/**
 * Extract the result type from a TypedDocumentNode.
 */
export type ResultOf<T> = T extends TypedDocumentNode<infer R, unknown> ? R : never;

/**
 * Extract the variables type from a TypedDocumentNode.
 */
export type VariablesOf<T> = T extends TypedDocumentNode<unknown, infer V> ? V : never;

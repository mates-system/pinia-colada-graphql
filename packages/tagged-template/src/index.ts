import { parse, print, type DocumentNode } from "graphql";
import type { TypedDocumentNode } from "./types";

/**
 * Cache for parsed documents to avoid re-parsing the same query.
 */
const documentCache = new Map<string, DocumentNode>();

/**
 * Parse a GraphQL document from a template literal.
 *
 * Returns a TypedDocumentNode that can be typed via declaration merging.
 *
 * @example
 * ```ts
 * import { graphql } from '@pinia-colada-graphql/tagged-template'
 *
 * const GetUserQuery = graphql`
 *   query GetUser($id: ID!) {
 *     user(id: $id) {
 *       id
 *       name
 *       email
 *     }
 *   }
 * `
 * ```
 */
export function graphql<TResult = unknown, TVariables = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: DocumentNode[]
): TypedDocumentNode<TResult, TVariables> {
  // Build the full source string
  let source = strings[0];
  for (let i = 0; i < values.length; i++) {
    // Handle embedded fragments
    const value = values[i];
    if (isDocumentNode(value)) {
      // Extract fragment definitions from embedded documents
      for (const definition of value.definitions) {
        if (definition.kind === "FragmentDefinition") {
          source += `\n${printFragment(definition)}`;
        }
      }
    }
    source += strings[i + 1];
  }

  // Check cache
  const cached = documentCache.get(source);
  if (cached) {
    return cached as TypedDocumentNode<TResult, TVariables>;
  }

  // Parse and cache
  const document = parse(source, {
    noLocation: true,
  });

  documentCache.set(source, document);

  return document as TypedDocumentNode<TResult, TVariables>;
}

/**
 * Alias for graphql`` for compatibility with other libraries.
 */
export const gql = graphql;

/**
 * Check if a value is a DocumentNode.
 */
function isDocumentNode(value: unknown): value is DocumentNode {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind: string }).kind === "Document"
  );
}

/**
 * Simple fragment printer (for embedding).
 */
function printFragment(definition: DocumentNode["definitions"][0]): string {
  if (definition.kind !== "FragmentDefinition") {
    return "";
  }

  return print(definition);
}

/**
 * Clear the document cache.
 */
export function clearDocumentCache(): void {
  documentCache.clear();
}

/**
 * Get the current size of the document cache.
 */
export function getDocumentCacheSize(): number {
  return documentCache.size;
}

// Re-export types
export type { TypedDocumentNode } from "./types";

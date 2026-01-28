import { parse, type DocumentNode, type DefinitionNode } from "graphql";

/**
 * Parse a GraphQL source string into a DocumentNode.
 */
export function parseGraphQL(source: string): DocumentNode {
  return parse(source, {
    noLocation: true,
  });
}

/**
 * Get operation information from a document.
 */
export interface OperationInfo {
  name: string | null;
  type: "query" | "mutation" | "subscription" | "fragment";
}

/**
 * Extract operation information from a DocumentNode.
 */
export function getOperations(document: DocumentNode): OperationInfo[] {
  const operations: OperationInfo[] = [];

  for (const definition of document.definitions) {
    const info = getOperationInfo(definition);
    if (info) {
      operations.push(info);
    }
  }

  return operations;
}

/**
 * Get operation info from a definition.
 */
function getOperationInfo(definition: DefinitionNode): OperationInfo | null {
  if (definition.kind === "OperationDefinition") {
    return {
      name: definition.name?.value ?? null,
      type: definition.operation,
    };
  }

  if (definition.kind === "FragmentDefinition") {
    return {
      name: definition.name.value,
      type: "fragment",
    };
  }

  return null;
}

/**
 * Generate code for a parsed GraphQL document.
 */
export function generateDocumentCode(source: string): string {
  const document = parseGraphQL(source);
  const operations = getOperations(document);

  // Generate the document as a JavaScript object
  const documentCode = `{
  kind: "Document",
  definitions: ${JSON.stringify(document.definitions, null, 2)}
}`;

  // Generate exports based on operations
  const exports: string[] = [];

  // Default export is the full document
  exports.push(`export default ${documentCode}`);

  // Named exports for each operation
  for (const op of operations) {
    if (op.name) {
      const exportName = op.name;
      exports.push(`export const ${exportName} = ${documentCode}`);
    }
  }

  return exports.join("\n\n");
}

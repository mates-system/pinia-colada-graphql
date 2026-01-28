/**
 * Type declarations for Vue SFC GraphQL custom blocks.
 *
 * Add this to your tsconfig.json types array:
 * ```json
 * {
 *   "compilerOptions": {
 *     "types": ["@pinia-colada-graphql/unplugin/client"]
 *   }
 * }
 * ```
 *
 * Or import it directly in a .d.ts file:
 * ```ts
 * /// <reference types="@pinia-colada-graphql/unplugin/client" />
 * ```
 */

// Augment Vue's custom block types
declare module "*.vue?graphql" {
  import type { DocumentNode } from "graphql";

  const document: DocumentNode;
  export default document;

  // Named exports are available for fragments and operations
  // The specific names depend on your GraphQL content
}

// Allow ?graphql suffix on Vue file imports
declare module "*.vue" {
  // This augments the existing Vue SFC module declaration
  // The actual types come from the generated virtual module
}

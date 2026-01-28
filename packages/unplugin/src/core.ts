import { createUnplugin } from "unplugin";
import type { GraphQLUnpluginOptions } from "./types";
import { generateDocumentCode, parseGraphQL } from "./codegen";

const GRAPHQL_EXTENSIONS = [".graphql", ".gql"];

function isGraphQLFile(id: string): boolean {
  return GRAPHQL_EXTENSIONS.some((ext) => id.endsWith(ext));
}

/**
 * Core unplugin implementation.
 */
export const unplugin = createUnplugin((_options: GraphQLUnpluginOptions = {}) => {
  // TODO: Use include/exclude for filtering when needed
  // const { include = ['**/*.graphql', '**/*.gql'], exclude = ['node_modules/**'] } = options

  return {
    name: "pinia-colada-graphql",
    enforce: "pre",

    transformInclude(id) {
      return isGraphQLFile(id);
    },

    transform(code, id) {
      if (!isGraphQLFile(id)) {
        return null;
      }

      try {
        // Parse and validate the GraphQL document
        parseGraphQL(code);

        // Generate the JavaScript code
        const result = generateDocumentCode(code);

        return {
          code: result,
          map: null,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.error(`Failed to parse GraphQL file ${id}: ${message}`);
        return null;
      }
    },

    vite: {
      config() {
        return {
          optimizeDeps: {
            exclude: ["@pinia-colada-graphql/core"],
          },
        };
      },
    },
  };
});

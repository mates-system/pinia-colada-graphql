import type { Plugin } from "vite";
import { parse as parseSFC, compileScript } from "@vue/compiler-sfc";
import { parse as parseGraphQL } from "graphql";
import { getOperations } from "./codegen/parser";
import { readFileSync } from "node:fs";

/**
 * Extract the content of a `<script lang="graphql">` block from a Vue SFC file
 * using the official Vue SFC parser.
 */
function extractGraphQLBlock(sfcContent: string): string | null {
  const { descriptor, errors } = parseSFC(sfcContent, {
    ignoreEmpty: false,
  });

  if (errors.length > 0) {
    // Ignore errors - they might be from other blocks
  }

  // Vue SFC parser treats <script lang="graphql"> as a script block
  // Check the script block for lang="graphql"
  if (descriptor.script?.lang === "graphql") {
    return descriptor.script.content.trim();
  }

  // Also check custom blocks with type="graphql" for backwards compatibility
  for (const block of descriptor.customBlocks) {
    if (block.type === "graphql") {
      return block.content.trim();
    }
  }

  return null;
}

/**
 * Remove the `<script lang="graphql">` block from the SFC content.
 * This allows the Vue compiler to process the rest of the SFC normally.
 */
function removeGraphQLScriptBlock(sfcContent: string): string {
  const { descriptor } = parseSFC(sfcContent, {
    ignoreEmpty: false,
  });

  // If there's a <script lang="graphql">, we need to remove it
  if (descriptor.script?.lang === "graphql") {
    const { loc } = descriptor.script;
    if (loc) {
      // Remove the script block from the source
      const before = sfcContent.slice(0, loc.start.offset);
      const after = sfcContent.slice(loc.end.offset);
      return before + after;
    }
  }

  return sfcContent;
}

/**
 * Read and extract GraphQL block from a Vue SFC file.
 */
function readGraphQLBlockFromFile(sfcPath: string): string | null {
  try {
    const content = readFileSync(sfcPath, "utf-8");
    return extractGraphQLBlock(content);
  } catch {
    return null;
  }
}

/**
 * Options for the Vue GraphQL block plugin.
 */
export interface VueGraphQLBlockOptions {
  /**
   * Generate TypeScript type declarations.
   * @default true
   */
  generateTypes?: boolean;

  /**
   * Enable fragment masking.
   * @default true
   */
  fragmentMasking?: boolean;
}

/**
 * Parse the GraphQL content and generate JavaScript code.
 */
function generateBlockCode(source: string, _sfcPath: string): string {
  const document = parseGraphQL(source, { noLocation: true });
  const operations = getOperations(document);

  const lines: string[] = [];

  // Import the parse function to reconstruct at runtime
  lines.push(`import { parse } from 'graphql'`);
  lines.push("");

  // Generate the document source as a string (for parsing at runtime)
  const escapedSource = JSON.stringify(source);

  // Parse once at module load
  lines.push(`const __document = parse(${escapedSource}, { noLocation: true })`);
  lines.push("");

  // Export each operation/fragment by name
  for (const op of operations) {
    if (op.name) {
      lines.push(`export const ${op.name} = __document`);
    }
  }

  // Default export is the document
  lines.push("");
  lines.push(`export default __document`);

  return lines.join("\n");
}

/**
 * Generate TypeScript declarations for the GraphQL block.
 */
function generateTypeDeclarations(source: string): string {
  const document = parseGraphQL(source, { noLocation: true });

  const lines: string[] = [];

  lines.push(
    `import type { TypedDocumentNode, TypedFragmentNode, FragmentRef } from '@pinia-colada-graphql/core'`,
  );
  lines.push("");

  for (const definition of document.definitions) {
    if (definition.kind === "FragmentDefinition") {
      const fragName = definition.name.value;
      const onType = definition.typeCondition.name.value;

      // Extract field names from the fragment
      const fields: string[] = [];
      for (const selection of definition.selectionSet.selections) {
        if (selection.kind === "Field") {
          const fieldName = selection.alias?.value ?? selection.name.value;
          fields.push(fieldName);
        }
      }

      lines.push(`/** Fragment data type for ${fragName} */`);
      lines.push(`export interface ${fragName}$data {`);
      lines.push(`  __typename: '${onType}'`);
      for (const field of fields) {
        lines.push(`  ${field}: unknown`);
      }
      lines.push(`}`);
      lines.push("");

      lines.push(`/** Fragment document for ${fragName} */`);
      lines.push(`export const ${fragName}: TypedFragmentNode<${fragName}$data, '${fragName}'>`);
      lines.push("");

      lines.push(`/** Fragment reference type (use this in props) */`);
      lines.push(`export type ${fragName}$key = FragmentRef<'${fragName}', '${onType}'> & {`);
      lines.push(`  readonly ' $fragmentRefs'?: ${fragName}$data`);
      lines.push(`}`);
      lines.push("");
    }

    if (definition.kind === "OperationDefinition" && definition.name) {
      const opName = definition.name.value;

      lines.push(`/** Result type for ${opName} */`);
      lines.push(`export interface ${opName}$data {`);
      lines.push(`  [key: string]: unknown`);
      lines.push(`}`);
      lines.push("");

      lines.push(`/** Variables type for ${opName} */`);
      lines.push(`export interface ${opName}$variables {`);
      if (definition.variableDefinitions) {
        for (const varDef of definition.variableDefinitions) {
          const varName = varDef.variable.name.value;
          lines.push(`  ${varName}?: unknown`);
        }
      }
      lines.push(`}`);
      lines.push("");

      lines.push(`/** Typed document for ${opName} */`);
      lines.push(`export const ${opName}: TypedDocumentNode<${opName}$data, ${opName}$variables>`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * Vite plugin for Vue SFC `<script lang="graphql">` blocks.
 *
 * @example
 * ```vue
 * <script lang="graphql">
 * fragment UserCard_user on User {
 *   name
 *   email
 * }
 * </script>
 *
 * <script setup lang="ts">
 * import { useFragment, type FragmentRef } from '@pinia-colada-graphql/core'
 * // Import from the virtual module (same file path + ?graphql)
 * import { UserCard_user, type UserCard_user$key } from './UserCard.vue?graphql'
 *
 * const props = defineProps<{ userRef: UserCard_user$key }>()
 * const user = useFragment(UserCard_user, () => props.userRef)
 * </script>
 * ```
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import vue from '@vitejs/plugin-vue'
 * import { vueGraphQLBlock } from '@pinia-colada-graphql/unplugin'
 *
 * export default defineConfig({
 *   plugins: [
 *     vueGraphQLBlock(), // Must be before vue()
 *     vue(),
 *   ],
 * })
 * ```
 */
export function vueGraphQLBlock(options: VueGraphQLBlockOptions = {}): Plugin[] {
  const { generateTypes = true } = options;

  // Cache for parsed GraphQL blocks
  const graphqlBlockCache = new Map<string, string>();

  return [
    // Plugin to strip <script lang="graphql"> from SFC before Vue processes it
    {
      name: "vue-graphql-strip",
      enforce: "pre",

      transform(code, id) {
        // Only process .vue files (not virtual modules or query strings)
        if (!id.endsWith(".vue")) {
          return null;
        }

        // Check if this SFC has a <script lang="graphql"> block
        const graphqlSource = extractGraphQLBlock(code);
        if (!graphqlSource) {
          return null;
        }

        // Cache the GraphQL source for later use
        graphqlBlockCache.set(id, graphqlSource);

        // Remove the <script lang="graphql"> block so Vue can process the rest
        const transformedCode = removeGraphQLScriptBlock(code);

        return {
          code: transformedCode,
          map: null,
        };
      },
    },

    // Plugin to handle <graphql> custom blocks (backwards compatibility)
    {
      name: "vue-graphql-block",
      enforce: "pre",

      transform(code, id) {
        // Handle ?vue&type=graphql (custom block transform)
        if (id.includes("?vue") && id.includes("type=graphql")) {
          // Skip if already transformed (contains JS exports)
          if (code.includes("import { parse }") || code.includes("export const")) {
            return null;
          }

          // Extract the base SFC path
          const sfcPath = id.split("?")[0];

          // The code here is the raw content of the <graphql> block
          const graphqlSource = code.trim();

          // Verify this looks like GraphQL (starts with fragment, query, mutation, or subscription)
          if (
            !graphqlSource.match(
              /^(fragment|query|mutation|subscription|type|input|enum|interface|scalar)\s/i,
            )
          ) {
            // Not GraphQL content, skip
            return null;
          }

          // Cache it for the virtual module
          graphqlBlockCache.set(sfcPath, graphqlSource);

          // Generate JavaScript code
          const jsCode = generateBlockCode(graphqlSource, sfcPath);

          return {
            code: jsCode,
            map: null,
          };
        }

        return null;
      },
    },

    // Plugin to provide virtual modules for ?graphql imports
    {
      name: "vue-graphql-virtual",
      enforce: "pre",

      resolveId(source, importer) {
        // Handle imports like './UserCard.vue?graphql'
        if (source.includes(".vue?graphql") || source.endsWith(".vue?graphql")) {
          // Parse the source to extract the vue path
          const [pathPart] = source.split("?");
          const vuePath = pathPart;

          // Resolve relative to importer
          if (importer && vuePath.startsWith(".")) {
            const importerDir = importer.substring(0, importer.lastIndexOf("/"));
            // Normalize path (handle ./ and ../)
            let resolved: string;
            if (vuePath.startsWith("./")) {
              resolved = importerDir + "/" + vuePath.substring(2);
            } else if (vuePath.startsWith("../")) {
              // Simple handling - go up one level
              const parentDir = importerDir.substring(0, importerDir.lastIndexOf("/"));
              resolved = parentDir + "/" + vuePath.substring(3);
            } else {
              resolved = importerDir + "/" + vuePath;
            }
            // Mark as virtual module with special prefix
            return `\0vue-graphql:${resolved}`;
          }

          return `\0vue-graphql:${vuePath}`;
        }

        return null;
      },

      load(id) {
        // Handle our virtual modules (prefixed with \0vue-graphql:)
        if (id.startsWith("\0vue-graphql:")) {
          const sfcPath = id.slice("\0vue-graphql:".length);
          let graphqlSource = graphqlBlockCache.get(sfcPath);

          // Fallback: read the SFC file directly and extract the block
          if (!graphqlSource) {
            graphqlSource = readGraphQLBlockFromFile(sfcPath) ?? undefined;
            if (graphqlSource) {
              graphqlBlockCache.set(sfcPath, graphqlSource);
            }
          }

          if (graphqlSource) {
            return generateBlockCode(graphqlSource, sfcPath);
          }

          // Return an empty module if no GraphQL block found
          console.warn(`[vue-graphql-block] No <script lang="graphql"> block found in ${sfcPath}`);
          return "export default {}";
        }

        return null;
      },
    },

    // Plugin to generate .d.ts for graphql blocks (for LSP support)
    ...(generateTypes
      ? [
          {
            name: "vue-graphql-types",
            enforce: "pre" as const,

            // Handle ?graphql&lang.d.ts for type declarations
            resolveId(source: string) {
              if (source.includes(".vue?graphql&lang.d.ts")) {
                const [pathPart] = source.split("?");
                return `\0vue-graphql-types:${pathPart}`;
              }
              return null;
            },

            load(id: string) {
              if (id.startsWith("\0vue-graphql-types:")) {
                const sfcPath = id.slice("\0vue-graphql-types:".length);
                let graphqlSource = graphqlBlockCache.get(sfcPath);

                // Fallback: read the SFC file directly
                if (!graphqlSource) {
                  graphqlSource = readGraphQLBlockFromFile(sfcPath) ?? undefined;
                  if (graphqlSource) {
                    graphqlBlockCache.set(sfcPath, graphqlSource);
                  }
                }

                if (graphqlSource) {
                  return generateTypeDeclarations(graphqlSource);
                }
              }
              return null;
            },
          } satisfies Plugin,
        ]
      : []),
  ];
}

export default vueGraphQLBlock;

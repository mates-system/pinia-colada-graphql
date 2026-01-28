/**
 * Options for the GraphQL unplugin.
 */
export interface GraphQLUnpluginOptions {
  /**
   * Glob patterns for GraphQL files.
   * @default ['**\/*.graphql', '**\/*.gql']
   */
  include?: string | string[];

  /**
   * Glob patterns to exclude.
   * @default ['node_modules/**']
   */
  exclude?: string | string[];

  /**
   * Path to the schema file or URL.
   * Required for type generation.
   */
  schema?: string;

  /**
   * Whether to generate TypeScript types.
   * @default true
   */
  generateTypes?: boolean;

  /**
   * Output path for generated types.
   * @default './src/graphql/generated.ts'
   */
  typesOutput?: string;

  /**
   * Enable fragment masking in generated types.
   * @default true
   */
  fragmentMasking?: boolean;
}

/**
 * Parsed GraphQL operation.
 */
export interface ParsedOperation {
  name: string | null;
  type: "query" | "mutation" | "subscription" | "fragment";
  source: string;
}

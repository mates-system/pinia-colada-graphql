export { unplugin } from "./core";
export { vueGraphQLBlock, type VueGraphQLBlockOptions } from "./vue-graphql-block";
export type { GraphQLUnpluginOptions, ParsedOperation } from "./types";
export {
  parseGraphQL,
  getOperations,
  generateDocumentCode,
  generateTypeDeclarations,
  generateCombinedTypes,
} from "./codegen";

/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

declare module "*.graphql" {
  import type { DocumentNode } from "graphql";
  const document: DocumentNode;
  export default document;
}

declare module "*.gql" {
  import type { DocumentNode } from "graphql";
  const document: DocumentNode;
  export default document;
}

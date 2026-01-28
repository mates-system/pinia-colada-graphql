import type { DocumentNode } from "graphql";

/**
 * Fragment reference - the opaque handle passed from parent to child.
 *
 * At runtime: { __typename: 'User', id: '1' }
 * At type level: carries fragment type info for data masking
 */
export interface FragmentRef<
  TFragmentName extends string = string,
  TTypename extends string = string,
> {
  readonly __typename: TTypename;
  readonly id: string | number;
  /** @internal */
  readonly " $fragmentName"?: TFragmentName;
  /** @internal */
  readonly " $fragmentRefs"?: unknown;
}

/**
 * Typed fragment node - a fragment document with embedded type info.
 */
export interface TypedFragmentNode<TData = unknown, TFragmentName extends string = string>
  extends DocumentNode {
  /** @internal */
  readonly " $fragmentType"?: TData;
  /** @internal */
  readonly " $fragmentName"?: TFragmentName;
}

/**
 * Extract fragment data type from TypedFragmentNode.
 */
export type FragmentDataOf<T> = T extends TypedFragmentNode<infer TData, string> ? TData : never;

/**
 * Extract fragment name from TypedFragmentNode.
 */
export type FragmentNameOf<T> = T extends TypedFragmentNode<unknown, infer TName> ? TName : never;

/**
 * Create a fragment ref type that can be passed to child components.
 */
export type FragmentType<TFragmentDoc extends TypedFragmentNode> =
  TFragmentDoc extends TypedFragmentNode<infer TData, infer TName>
    ? FragmentRef<TName, string> & { readonly " $fragmentRefs"?: TData }
    : never;

/**
 * Unmask a fragment ref to get the actual data type.
 */
export type UnmaskFragment<T> = T extends { readonly " $fragmentRefs"?: infer TData }
  ? TData extends undefined
    ? never
    : TData
  : T;

/**
 * Check if a type has fragment refs (is masked).
 */
export type HasFragmentRefs<T> = T extends { readonly " $fragmentRefs"?: unknown } ? true : false;

/**
 * Make fields masked - parent sees only id/__typename, child sees full data.
 */
export type MaskFragmentFields<TData, TFragmentName extends string, TFragmentData> = Omit<
  TData,
  keyof TFragmentData
> &
  FragmentRef<TFragmentName, TData extends { __typename: infer T } ? T & string : string> & {
    readonly " $fragmentRefs"?: TFragmentData;
  };

/**
 * Helper to check if a type is a fragment reference.
 */
export type IsFragmentRef<T> = T extends FragmentRef<string, string> ? true : false;

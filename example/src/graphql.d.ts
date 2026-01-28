/// <reference types="@pinia-colada-graphql/unplugin/client" />

import type { TypedDocumentNode, TypedFragmentNode, FragmentRef } from "@pinia-colada-graphql/core";

// ============================================================================
// UserCard Fragment (from <graphql> custom block)
// ============================================================================

declare module "./components/UserCard.vue?graphql" {
  /** Data returned by useFragment(UserCard_user, ref) */
  export interface UserCard_user$data {
    readonly __typename: "User";
    readonly name: string;
    readonly email: string;
  }

  /** The fragment document */
  export const UserCard_user: TypedFragmentNode<UserCard_user$data, "UserCard_user">;

  /** Prop type for parent → child */
  export type UserCard_user$key = FragmentRef<"UserCard_user", "User">;
}

// ============================================================================
// Shared Types
// ============================================================================

/** User entity with fragment spread - parent sees only id/__typename */
export interface User$ref extends FragmentRef<"UserCard_user", "User"> {
  readonly id: string;
}

// ============================================================================
// GetUsers Query
// ============================================================================

export interface GetUsersQuery$data {
  readonly users: readonly User$ref[];
}

export type GetUsersQuery$variables = Record<string, never>;

/** Typed GetUsers query - use with gql`` */
export type GetUsersQuery = TypedDocumentNode<GetUsersQuery$data, GetUsersQuery$variables>;

// ============================================================================
// CreateUser Mutation
// ============================================================================

export interface CreateUserMutation$data {
  readonly createUser: User$ref;
}

export interface CreateUserMutation$variables {
  readonly name: string;
  readonly email: string;
}

/** Typed CreateUser mutation - use with gql`` */
export type CreateUserMutation = TypedDocumentNode<
  CreateUserMutation$data,
  CreateUserMutation$variables
>;

// ============================================================================
// Module Augmentation for gql template
// ============================================================================

declare module "@pinia-colada-graphql/tagged-template" {
  // Overload for GetUsersQuery
  export function gql(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): TypedDocumentNode<unknown, unknown>;
}

import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from "vue";
import type { TypedFragmentNode, FragmentDataOf, FragmentRef, FragmentType } from "../types";
import { useNormalizedCache, type EntityId } from "../cache";

/**
 * Options for useFragment.
 */
export interface UseFragmentOptions {
  /**
   * Whether to throw an error if the fragment reference is not found.
   */
  throwOnMissing?: boolean;
}

/**
 * Read a fragment from the normalized cache.
 *
 * Provides Relay-style data masking - components only see data for their declared fragments.
 *
 * @example
 * ```ts
 * // Type is inferred from the fragment document
 * const user = useFragment(UserCard_user, () => props.userRef);
 * // user.value?.name - fully typed!
 * ```
 */
export function useFragment<TData, TName extends string>(
  fragmentDoc: TypedFragmentNode<TData, TName>,
  fragmentRef: MaybeRefOrGetter<FragmentRef<TName, string> | null | undefined>,
  options?: UseFragmentOptions,
): ComputedRef<TData | null>;

export function useFragment<TFragment extends TypedFragmentNode<unknown, string>>(
  fragmentDoc: TFragment,
  fragmentRef: MaybeRefOrGetter<FragmentType<TFragment> | FragmentRef | null | undefined>,
  options?: UseFragmentOptions,
): ComputedRef<FragmentDataOf<TFragment> | null>;

export function useFragment<TFragment extends TypedFragmentNode<unknown, string>>(
  fragmentDoc: TFragment,
  fragmentRef: MaybeRefOrGetter<FragmentType<TFragment> | FragmentRef | null | undefined>,
  options: UseFragmentOptions = {},
): ComputedRef<FragmentDataOf<TFragment> | null> {
  const cache = useNormalizedCache();
  const { throwOnMissing = false } = options;
  const fragmentName = getFragmentName(fragmentDoc);

  return computed(() => {
    const ref = toValue(fragmentRef);

    if (!ref) {
      return null;
    }

    const { __typename, id } = ref;

    if (!__typename) {
      if (throwOnMissing) {
        throw new Error(
          `[pinia-colada-graphql] Fragment "${fragmentName}" is missing __typename`,
        );
      }
      return null;
    }

    if (id == null) {
      if (throwOnMissing) {
        throw new Error(`[pinia-colada-graphql] Fragment "${fragmentName}" is missing id`);
      }
      return null;
    }

    const entityId = `${__typename}:${id}` as EntityId;
    const entity = cache.readFragment<FragmentDataOf<TFragment>>(entityId, fragmentDoc);

    if (!entity && throwOnMissing) {
      throw new Error(
        `[pinia-colada-graphql] Entity not found for fragment "${fragmentName}": ${entityId}`,
      );
    }

    return entity;
  });
}

function getFragmentName(document: TypedFragmentNode<unknown, string>): string {
  for (const definition of document.definitions) {
    if (definition.kind === "FragmentDefinition") {
      return definition.name.value;
    }
  }
  return "UnknownFragment";
}

/**
 * Create a fragment reference from an object.
 */
export function makeFragmentRef<
  TTypename extends string,
  T extends { __typename: TTypename; id: string | number },
>(object: T): FragmentRef<string, TTypename> {
  return object as FragmentRef<string, TTypename>;
}

/**
 * Type guard to check if a value is a valid fragment reference.
 */
export function isFragmentRef(value: unknown): value is FragmentRef {
  return (
    typeof value === "object" &&
    value !== null &&
    "__typename" in value &&
    "id" in value &&
    typeof (value as Record<string, unknown>).__typename === "string"
  );
}

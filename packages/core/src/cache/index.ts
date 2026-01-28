export {
  useNormalizedCache,
  NORMALIZED_CACHE_STORE_ID,
  type NormalizedCache,
  type NormalizedCacheOptions,
} from "./normalized-cache";

export {
  normalize,
  denormalize,
  denormalizeWithMask,
  getEntityId,
  getFragmentFields,
  toEntityRef,
  isEntity,
  isEntityRef,
} from "./entity-store";

export type {
  EntityId,
  EntityRef,
  StoredEntity,
  TypePolicies,
  TypePolicy,
  FieldPolicy,
  FieldPolicies,
  OptimisticLayer,
} from "./types";

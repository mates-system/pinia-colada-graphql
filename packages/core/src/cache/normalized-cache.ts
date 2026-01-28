import { defineStore } from "pinia";
import { shallowRef, triggerRef } from "vue";
import type { DocumentNode } from "graphql";
import type { EntityId, OptimisticLayer, StoredEntity, TypePolicies } from "./types";
import {
  denormalize,
  denormalizeWithMask,
  getEntityId,
  getFragmentFields,
  normalize,
  toEntityRef,
} from "./entity-store";

/**
 * Store ID for the normalized cache.
 */
export const NORMALIZED_CACHE_STORE_ID = "_pc_graphql_cache";

/**
 * Options for the normalized cache.
 */
export interface NormalizedCacheOptions {
  typePolicies?: TypePolicies;
}

/**
 * Create the normalized cache store.
 */
export const useNormalizedCache = defineStore(NORMALIZED_CACHE_STORE_ID, () => {
  // Main entity storage
  const entities = shallowRef(new Map<EntityId, StoredEntity>());

  // Optimistic layers (applied on top of main entities)
  const optimisticLayers = shallowRef<OptimisticLayer[]>([]);

  // Type policies for customizing cache behavior
  let typePolicies: TypePolicies = {};

  /**
   * Configure type policies.
   */
  function setTypePolicies(policies: TypePolicies): void {
    typePolicies = policies;
  }

  /**
   * Get all entities, including optimistic layers.
   */
  function getEntities(): Map<EntityId, StoredEntity> {
    if (optimisticLayers.value.length === 0) {
      return entities.value;
    }

    // Merge optimistic layers on top of base entities
    const merged = new Map(entities.value);
    for (const layer of optimisticLayers.value) {
      for (const [id, entity] of layer.entities) {
        const existing = merged.get(id);
        if (existing) {
          merged.set(id, { ...existing, ...entity });
        } else {
          merged.set(id, entity);
        }
      }
    }
    return merged;
  }

  /**
   * Write data to the cache.
   */
  function write(
    data: unknown,
    _document?: DocumentNode,
    _variables?: Record<string, unknown>,
  ): void {
    const { entities: newEntities } = normalize(data, typePolicies);

    // Merge new entities into existing
    const updatedEntities = new Map(entities.value);
    for (const [id, entity] of newEntities) {
      const existing = updatedEntities.get(id);
      if (existing) {
        updatedEntities.set(id, { ...existing, ...entity });
      } else {
        updatedEntities.set(id, entity);
      }
    }

    entities.value = updatedEntities;
    triggerRef(entities);
  }

  /**
   * Read data from the cache.
   */
  function read<T>(
    rootResult: unknown,
    _document?: DocumentNode,
    _variables?: Record<string, unknown>,
  ): T | null {
    try {
      const allEntities = getEntities();
      return denormalize<T>(rootResult, allEntities);
    } catch {
      return null;
    }
  }

  /**
   * Read a fragment from the cache.
   *
   * When a fragment document is provided, only the fields declared in the
   * fragment are returned (data masking). This ensures components only see
   * the data they explicitly requested.
   *
   * @param id - Entity ID or object with __typename and id
   * @param fragment - Optional fragment document for field masking
   */
  function readFragment<T>(
    id: EntityId | { __typename: string; id: string | number },
    fragment?: DocumentNode,
  ): T | null {
    const entityId =
      typeof id === "string" ? id : getEntityId(id as Record<string, unknown>, typePolicies);

    if (!entityId) {
      return null;
    }

    const allEntities = getEntities();
    const entity = allEntities.get(entityId);

    if (!entity) {
      return null;
    }

    // If a fragment is provided, only return the fields declared in it
    if (fragment) {
      const fragmentFields = getFragmentFields(fragment);
      return denormalizeWithMask<T>(entity, allEntities, fragmentFields);
    }

    // No fragment provided, return all fields
    return denormalize<T>(entity, allEntities);
  }

  /**
   * Write a fragment to the cache.
   *
   * @param id - Entity ID or object with __typename and id
   * @param data - Data to write
   * @param _fragment - Optional fragment document (for future validation)
   */
  function writeFragment(
    id: EntityId | { __typename: string; id: string | number },
    data: Record<string, unknown>,
    _fragment?: DocumentNode,
  ): void {
    const entityId =
      typeof id === "string" ? id : getEntityId(id as Record<string, unknown>, typePolicies);

    if (!entityId) {
      return;
    }

    const updatedEntities = new Map(entities.value);
    const existing = updatedEntities.get(entityId);

    if (existing) {
      updatedEntities.set(entityId, { ...existing, ...data } as StoredEntity);
    } else {
      updatedEntities.set(entityId, data as StoredEntity);
    }

    entities.value = updatedEntities;
    triggerRef(entities);
  }

  /**
   * Evict an entity from the cache.
   */
  function evict(
    id: EntityId | { __typename: string; id: string | number },
    fieldName?: string,
  ): boolean {
    const entityId =
      typeof id === "string" ? id : getEntityId(id as Record<string, unknown>, typePolicies);

    if (!entityId) {
      return false;
    }

    const updatedEntities = new Map(entities.value);
    const entity = updatedEntities.get(entityId);

    if (!entity) {
      return false;
    }

    if (fieldName) {
      // Remove specific field
      const { [fieldName]: _, ...rest } = entity;
      updatedEntities.set(entityId, rest as StoredEntity);
    } else {
      // Remove entire entity
      updatedEntities.delete(entityId);
    }

    entities.value = updatedEntities;
    triggerRef(entities);
    return true;
  }

  /**
   * Clear the entire cache.
   */
  function clear(): void {
    entities.value = new Map();
    optimisticLayers.value = [];
    triggerRef(entities);
    triggerRef(optimisticLayers);
  }

  /**
   * Add an optimistic layer.
   */
  function addOptimisticLayer(layerId: string, data: unknown): void {
    const { entities: newEntities } = normalize(data, typePolicies);

    optimisticLayers.value = [
      ...optimisticLayers.value,
      {
        id: layerId,
        entities: newEntities,
      },
    ];
    triggerRef(optimisticLayers);
  }

  /**
   * Remove an optimistic layer.
   */
  function removeOptimisticLayer(layerId: string): void {
    optimisticLayers.value = optimisticLayers.value.filter((layer) => layer.id !== layerId);
    triggerRef(optimisticLayers);
  }

  /**
   * Convert an object to an entity reference.
   */
  function toReference(object: Record<string, unknown>) {
    const entityId = getEntityId(object, typePolicies);
    return entityId ? toEntityRef(entityId) : undefined;
  }

  /**
   * Get an entity by ID.
   */
  function getEntity(id: EntityId): StoredEntity | undefined {
    return getEntities().get(id);
  }

  /**
   * Get all entity IDs.
   */
  function getEntityIds(): EntityId[] {
    return Array.from(getEntities().keys());
  }

  /**
   * Get entities by typename.
   */
  function getEntitiesByType(typename: string): StoredEntity[] {
    const result: StoredEntity[] = [];
    for (const entity of getEntities().values()) {
      if (entity.__typename === typename) {
        result.push(entity);
      }
    }
    return result;
  }

  return {
    // State
    entities,
    optimisticLayers,

    // Configuration
    setTypePolicies,

    // Read operations
    read,
    readFragment,
    getEntity,
    getEntityIds,
    getEntitiesByType,

    // Write operations
    write,
    writeFragment,
    evict,
    clear,

    // Optimistic updates
    addOptimisticLayer,
    removeOptimisticLayer,

    // Utilities
    toReference,
  };
});

/**
 * The normalized cache store type.
 */
export type NormalizedCache = ReturnType<typeof useNormalizedCache>;

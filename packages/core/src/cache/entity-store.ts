import type { DocumentNode, FieldNode, FragmentDefinitionNode, SelectionSetNode } from "graphql";
import type { EntityId, EntityRef, KeyFieldsFunction, StoredEntity, TypePolicies } from "./types";

/**
 * Check if a value is an entity reference.
 */
export function isEntityRef(value: unknown): value is EntityRef {
  return typeof value === "object" && value !== null && "__ref" in value;
}

/**
 * Check if an object is an entity (has __typename and an id).
 */
export function isEntity(value: unknown): value is StoredEntity {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return typeof obj.__typename === "string" && (obj.id != null || obj._id != null);
}

/**
 * Get the entity ID for an object.
 */
export function getEntityId(
  object: Record<string, unknown>,
  typePolicies?: TypePolicies,
): EntityId | null {
  const typename = object.__typename as string | undefined;

  if (!typename) {
    return null;
  }

  const policy = typePolicies?.[typename];
  const keyFields = policy?.keyFields;

  if (typeof keyFields === "function") {
    const customKey = (keyFields as KeyFieldsFunction)(object);
    return customKey ? (`${typename}:${customKey}` as EntityId) : null;
  }

  if (Array.isArray(keyFields)) {
    const keyParts = keyFields.map((field) => {
      const value = object[field];
      if (value === undefined || value === null) return "";
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
      }
      return "";
    });
    return `${typename}:${keyParts.join(":")}` as EntityId;
  }

  // Default: use id or _id
  const id = object.id ?? object._id;
  if (id == null) {
    return null;
  }

  // Ensure id is a primitive type
  if (typeof id !== "string" && typeof id !== "number") {
    return null;
  }

  return `${typename}:${String(id)}` as EntityId;
}

/**
 * Create an entity reference.
 */
export function toEntityRef(entityId: EntityId): EntityRef {
  return { __ref: entityId };
}

/**
 * Normalize a GraphQL response into entities and references.
 */
export function normalize(
  data: unknown,
  typePolicies?: TypePolicies,
): {
  result: unknown;
  entities: Map<EntityId, StoredEntity>;
} {
  const entities = new Map<EntityId, StoredEntity>();

  function normalizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(normalizeValue);
    }

    if (typeof value === "object") {
      const obj = value as Record<string, unknown>;
      const entityId = getEntityId(obj, typePolicies);

      // Normalize nested objects first
      const normalizedObj: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(obj)) {
        normalizedObj[key] = normalizeValue(val);
      }

      if (entityId) {
        // Merge with existing entity
        const existing = entities.get(entityId);
        if (existing) {
          entities.set(entityId, { ...existing, ...normalizedObj } as StoredEntity);
        } else {
          entities.set(entityId, normalizedObj as StoredEntity);
        }
        return toEntityRef(entityId);
      }

      return normalizedObj;
    }

    return value;
  }

  const result = normalizeValue(data);

  return { result, entities };
}

/**
 * Denormalize a result by resolving entity references.
 */
export function denormalize<T>(
  result: unknown,
  entities: Map<EntityId, StoredEntity>,
  visited = new Set<EntityId>(),
): T {
  if (result === null || result === undefined) {
    return result as T;
  }

  if (Array.isArray(result)) {
    return result.map((item) => denormalize(item, entities, visited)) as T;
  }

  if (isEntityRef(result)) {
    const entityId = result.__ref;
    if (visited.has(entityId)) {
      // Circular reference, return the ref as-is
      return { __ref: entityId } as T;
    }

    const entity = entities.get(entityId);
    if (!entity) {
      return undefined as T;
    }

    visited.add(entityId);
    const denormalized = denormalize(entity, entities, visited);
    visited.delete(entityId);
    return denormalized as T;
  }

  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;
    const denormalizedObj: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      denormalizedObj[key] = denormalize(val, entities, visited);
    }
    return denormalizedObj as T;
  }

  return result as T;
}

/**
 * Extract field names from a fragment document.
 * Returns a set of field names that are selected in the fragment.
 */
export function getFragmentFields(fragment: DocumentNode): Set<string> {
  const fields = new Set<string>();

  // Find the fragment definition
  const fragmentDef = fragment.definitions.find(
    (def): def is FragmentDefinitionNode => def.kind === "FragmentDefinition",
  );

  if (!fragmentDef) {
    return fields;
  }

  // Extract fields from selection set
  extractFieldsFromSelectionSet(fragmentDef.selectionSet, fields);

  // Always include __typename
  fields.add("__typename");

  return fields;
}

/**
 * Recursively extract field names from a selection set.
 */
function extractFieldsFromSelectionSet(selectionSet: SelectionSetNode, fields: Set<string>): void {
  for (const selection of selectionSet.selections) {
    if (selection.kind === "Field") {
      const fieldNode = selection as FieldNode;
      // Use alias if present, otherwise use the field name
      const fieldName = fieldNode.alias?.value ?? fieldNode.name.value;
      fields.add(fieldName);
    }
    // Note: We don't recurse into nested selections because those would be
    // separate entities in the normalized cache
  }
}

/**
 * Denormalize an entity with only the fields specified in a fragment.
 * This enables data masking - components only see the fields they requested.
 */
export function denormalizeWithMask<T>(
  entity: StoredEntity,
  entities: Map<EntityId, StoredEntity>,
  fragmentFields: Set<string>,
  visited = new Set<EntityId>(),
): T {
  const result: Record<string, unknown> = {};

  for (const fieldName of fragmentFields) {
    if (!(fieldName in entity)) {
      continue;
    }

    const value = entity[fieldName];

    // Denormalize nested entity references
    if (isEntityRef(value)) {
      const refEntity = entities.get(value.__ref);
      if (refEntity && !visited.has(value.__ref)) {
        visited.add(value.__ref);
        // For nested entities, return the full denormalized object
        // (the child fragment will mask it if needed)
        result[fieldName] = denormalize(refEntity, entities, new Set(visited));
        visited.delete(value.__ref);
      } else {
        result[fieldName] = value;
      }
    } else if (Array.isArray(value)) {
      // Handle arrays of entity references
      result[fieldName] = value.map((item) => {
        if (isEntityRef(item)) {
          const refEntity = entities.get(item.__ref);
          if (refEntity && !visited.has(item.__ref)) {
            visited.add(item.__ref);
            const denormalized = denormalize(refEntity, entities, new Set(visited));
            visited.delete(item.__ref);
            return denormalized;
          }
          return item;
        }
        return item;
      });
    } else {
      result[fieldName] = value;
    }
  }

  return result as T;
}

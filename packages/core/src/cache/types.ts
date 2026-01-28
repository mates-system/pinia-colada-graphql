/**
 * Entity identifier composed of typename and id.
 */
export type EntityId = `${string}:${string}`;

/**
 * A reference to an entity in the cache.
 */
export interface EntityRef {
  __ref: EntityId;
}

/**
 * A stored entity in the cache.
 */
export interface StoredEntity {
  __typename: string;
  id: string;
  [key: string]: unknown;
}

/**
 * Type policies for customizing cache behavior.
 */
export interface TypePolicies {
  [typename: string]: TypePolicy;
}

/**
 * Policy for a specific type.
 */
export interface TypePolicy {
  /**
   * Custom function to generate the cache key for this type.
   * Defaults to using `${__typename}:${id}`.
   */
  keyFields?: string[] | KeyFieldsFunction;

  /**
   * Field policies for this type.
   */
  fields?: FieldPolicies;

  /**
   * Merge function for this type.
   */
  merge?: MergeFunction<unknown>;
}

/**
 * Field policies for a type.
 */
export interface FieldPolicies {
  [fieldName: string]: FieldPolicy<unknown>;
}

/**
 * Policy for a specific field.
 */
export interface FieldPolicy<TValue> {
  /**
   * Custom read function for this field.
   */
  read?: FieldReadFunction<TValue>;

  /**
   * Custom merge function for this field.
   */
  merge?: MergeFunction<TValue>;

  /**
   * Arguments that affect the cache key for this field.
   */
  keyArgs?: string[] | false;
}

/**
 * Function to generate key fields for an entity.
 */
export type KeyFieldsFunction = (object: Record<string, unknown>) => string | null;

/**
 * Function to read a field value.
 */
export type FieldReadFunction<TValue> = (
  existing: TValue | undefined,
  options: FieldReadOptions,
) => TValue | undefined;

/**
 * Options passed to field read functions.
 */
export interface FieldReadOptions {
  args: Record<string, unknown> | null;
  fieldName: string;
  toReference: (object: Record<string, unknown>) => EntityRef | undefined;
  readField: <T>(fieldName: string, from?: EntityRef) => T | undefined;
}

/**
 * Function to merge field values.
 */
export type MergeFunction<TValue> = (
  existing: TValue | undefined,
  incoming: TValue,
  options: MergeOptions,
) => TValue;

/**
 * Options passed to merge functions.
 */
export interface MergeOptions {
  args: Record<string, unknown> | null;
  fieldName: string;
  toReference: (object: Record<string, unknown>) => EntityRef | undefined;
  mergeObjects: <T extends Record<string, unknown>>(existing: T, incoming: T) => T;
}

/**
 * An optimistic update layer.
 */
export interface OptimisticLayer {
  id: string;
  entities: Map<EntityId, StoredEntity>;
}

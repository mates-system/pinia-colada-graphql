import type { TypedDocumentNode } from "../types";

/**
 * Context passed to header functions for dynamic header generation.
 */
export interface HeadersContext {
  operationName?: string;
  operationType?: "query" | "mutation" | "subscription";
  variables?: Record<string, unknown>;
}

/**
 * Function type for dynamic header generation.
 */
export type HeadersFunction = (context: HeadersContext) => HeadersInit | Promise<HeadersInit>;

/**
 * Context for request interceptors.
 */
export interface RequestContext<TVariables = unknown> {
  document: TypedDocumentNode<unknown, TVariables>;
  variables?: TVariables;
  operationName?: string;
  operationType?: "query" | "mutation" | "subscription";
  headers: Headers;
}

/**
 * Context for response interceptors.
 */
export interface ResponseContext<TData = unknown, TVariables = unknown> {
  document: TypedDocumentNode<TData, TVariables>;
  variables?: TVariables;
  operationName?: string;
  response: GraphQLResponse<TData>;
}

/**
 * Context for error interceptors.
 */
export interface ErrorContext<TVariables = unknown> {
  document: TypedDocumentNode<unknown, TVariables>;
  variables?: TVariables;
  operationName?: string;
  error: Error;
  /** Retry the request (up to maxRetries) */
  retry: () => Promise<GraphQLResponse<unknown>>;
  /** Number of retries attempted */
  retryCount: number;
}

/**
 * Interceptor functions for request/response lifecycle.
 */
export interface GraphQLInterceptors {
  /**
   * Called before each request. Can modify headers or abort.
   * @returns void to continue, or throw to abort
   */
  onRequest?: (context: RequestContext) => void | Promise<void>;

  /**
   * Called after each successful response. Can transform data.
   * @returns the response (possibly modified)
   */
  onResponse?: <T>(context: ResponseContext<T>) => GraphQLResponse<T> | Promise<GraphQLResponse<T>>;

  /**
   * Called when an error occurs. Can retry or transform the error.
   * @returns the error to throw, or null to suppress
   */
  onError?: (context: ErrorContext) => Error | null | Promise<Error | null>;
}

/**
 * Options for creating a GraphQL client.
 */
export interface GraphQLClientOptions {
  /**
   * The URL of the GraphQL endpoint.
   */
  url: string;

  /**
   * Custom fetch function.
   */
  fetch?: typeof fetch;

  /**
   * Headers to include with every request.
   */
  headers?: HeadersInit | HeadersFunction;

  /**
   * Credentials mode for requests.
   */
  credentials?: RequestCredentials;

  /**
   * Request/response interceptors.
   */
  interceptors?: GraphQLInterceptors;

  /**
   * Maximum number of retries for failed requests.
   * @default 0
   */
  maxRetries?: number;
}

/**
 * Options for executing a GraphQL request.
 */
export interface GraphQLRequestOptions<TVariables> {
  variables?: TVariables;
  headers?: HeadersInit;
  signal?: AbortSignal;
  operationName?: string;
}

/**
 * A GraphQL response.
 */
export interface GraphQLResponse<TData> {
  data?: TData;
  errors?: GraphQLError[];
  extensions?: Record<string, unknown>;
}

/**
 * A GraphQL error.
 */
export interface GraphQLError {
  message: string;
  locations?: Array<{ line: number; column: number }>;
  path?: Array<string | number>;
  extensions?: Record<string, unknown>;
}

/**
 * A GraphQL client for executing operations.
 */
export interface GraphQLClient {
  execute<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    options?: GraphQLRequestOptions<TVariables>,
  ): Promise<GraphQLResponse<TResult>>;

  readonly url: string;
}

import { print } from "graphql";
import type { TypedDocumentNode } from "../types";
import type {
  GraphQLClient,
  GraphQLClientOptions,
  GraphQLError,
  GraphQLRequestOptions,
  GraphQLResponse,
  HeadersContext,
  RequestContext,
  ResponseContext,
  ErrorContext,
} from "./types";

/**
 * Error thrown when a GraphQL operation fails.
 */
export class GraphQLClientError extends Error {
  constructor(
    message: string,
    public readonly errors: GraphQLError[],
    public readonly response?: GraphQLResponse<unknown>,
  ) {
    super(message);
    this.name = "GraphQLClientError";
  }

  /**
   * Check if this error has a specific error code.
   */
  hasErrorCode(code: string): boolean {
    return this.errors.some((e) => e.extensions?.code === code);
  }

  /**
   * Get the first error with a specific code.
   */
  getErrorByCode(code: string): GraphQLError | undefined {
    return this.errors.find((e) => e.extensions?.code === code);
  }
}

function getOperationInfo<TResult, TVariables>(
  document: TypedDocumentNode<TResult, TVariables>,
): { name: string | undefined; type: "query" | "mutation" | "subscription" | undefined } {
  for (const definition of document.definitions) {
    if (definition.kind === "OperationDefinition") {
      return {
        name: definition.name?.value,
        type: definition.operation,
      };
    }
  }
  return { name: undefined, type: undefined };
}

/**
 * Create a GraphQL client with interceptor support.
 */
export function createGraphQLClient(options: GraphQLClientOptions): GraphQLClient {
  const {
    url,
    fetch: customFetch = fetch,
    headers: globalHeaders,
    credentials,
    interceptors = {},
    maxRetries = 0,
  } = options;

  async function execute<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    requestOptions: GraphQLRequestOptions<TVariables> = {},
    retryCount = 0,
  ): Promise<GraphQLResponse<TResult>> {
    const { variables, headers: requestHeaders, signal, operationName } = requestOptions;
    const opInfo = getOperationInfo(document);

    // Build headers
    const headersContext: HeadersContext = {
      operationName: operationName ?? opInfo.name,
      operationType: opInfo.type,
      variables: variables as Record<string, unknown> | undefined,
    };

    const resolvedGlobalHeaders =
      typeof globalHeaders === "function" ? await globalHeaders(headersContext) : globalHeaders;

    const headers = new Headers();
    headers.set("Content-Type", "application/json");
    headers.set("Accept", "application/json");

    if (resolvedGlobalHeaders) {
      const globalHeadersObj = new Headers(resolvedGlobalHeaders);
      globalHeadersObj.forEach((value, key) => headers.set(key, value));
    }

    if (requestHeaders) {
      const requestHeadersObj = new Headers(requestHeaders);
      requestHeadersObj.forEach((value, key) => headers.set(key, value));
    }

    // Call onRequest interceptor
    if (interceptors.onRequest) {
      const requestContext: RequestContext<TVariables> = {
        document,
        variables,
        operationName: operationName ?? opInfo.name,
        operationType: opInfo.type,
        headers,
      };
      await interceptors.onRequest(requestContext);
    }

    // Build request body
    const body: Record<string, unknown> = {
      query: print(document),
    };

    if (variables !== undefined) {
      body.variables = variables;
    }

    if (operationName !== undefined) {
      body.operationName = operationName;
    }

    try {
      const response = await customFetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal,
        credentials,
      });

      if (!response.ok) {
        throw new GraphQLClientError(
          `HTTP ${response.status}: ${response.statusText}`,
          [{ message: `HTTP ${response.status}: ${response.statusText}` }],
        );
      }

      let result = (await response.json()) as GraphQLResponse<TResult>;

      // Check for GraphQL errors
      if (result.errors?.length) {
        const error = new GraphQLClientError(
          result.errors.map((e) => e.message).join("; "),
          result.errors,
          result,
        );

        if (interceptors.onError) {
          const errorContext: ErrorContext<TVariables> = {
            document,
            variables,
            operationName: operationName ?? opInfo.name,
            error,
            retry: () => execute(document, requestOptions, retryCount + 1) as Promise<GraphQLResponse<unknown>>,
            retryCount,
          };

          const handledError = await interceptors.onError(errorContext);
          if (handledError === null) {
            // Error was suppressed, return the partial result
            return result;
          }
          throw handledError;
        }

        throw error;
      }

      // Call onResponse interceptor
      if (interceptors.onResponse) {
        const responseContext: ResponseContext<TResult, TVariables> = {
          document,
          variables,
          operationName: operationName ?? opInfo.name,
          response: result,
        };
        result = await interceptors.onResponse(responseContext);
      }

      return result;
    } catch (error) {
      // Handle network/unexpected errors
      if (error instanceof GraphQLClientError) {
        throw error;
      }

      const clientError =
        error instanceof Error
          ? new GraphQLClientError(error.message, [{ message: error.message }])
          : new GraphQLClientError("Unknown error", [{ message: String(error) }]);

      if (interceptors.onError) {
        const errorContext: ErrorContext<TVariables> = {
          document,
          variables,
          operationName: operationName ?? opInfo.name,
          error: clientError,
          retry: async () => {
            if (retryCount >= maxRetries) {
              throw clientError;
            }
            return execute(document, requestOptions, retryCount + 1) as Promise<GraphQLResponse<unknown>>;
          },
          retryCount,
        };

        const handledError = await interceptors.onError(errorContext);
        if (handledError === null) {
          return { data: undefined };
        }
        throw handledError;
      }

      throw clientError;
    }
  }

  return {
    execute,
    url,
  };
}

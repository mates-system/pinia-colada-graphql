import { shallowRef } from "vue";
import type { DocumentNode } from "graphql";
import { print } from "graphql";
import type { TypedDocumentNode } from "@pinia-colada-graphql/core";

export type OperationType = "query" | "mutation" | "subscription";

export interface QueryLogEntry {
  id: string;
  type: OperationType;
  operationName: string | null;
  document: string;
  variables: Record<string, unknown> | undefined;
  timestamp: number;
  duration: number | null;
  status: "pending" | "success" | "error";
  response: unknown | null;
  error: string | null;
}

const entries = shallowRef<QueryLogEntry[]>([]);
let idCounter = 0;

export function useQueryLog() {
  function addEntry(
    document: TypedDocumentNode<unknown, unknown> | DocumentNode,
    variables: Record<string, unknown> | undefined,
  ): string {
    const id = `query-${++idCounter}`;
    let operationName: string | null = null;
    let type: OperationType = "query";

    for (const def of document.definitions) {
      if (def.kind === "OperationDefinition") {
        operationName = def.name?.value ?? null;
        type = def.operation;
        break;
      }
    }

    const entry: QueryLogEntry = {
      id,
      type,
      operationName,
      document: print(document),
      variables,
      timestamp: Date.now(),
      duration: null,
      status: "pending",
      response: null,
      error: null,
    };

    entries.value = [entry, ...entries.value].slice(0, 50);
    return id;
  }

  function updateEntry(
    id: string,
    update: Partial<Pick<QueryLogEntry, "status" | "duration" | "response" | "error">>,
  ) {
    entries.value = entries.value.map((entry) =>
      entry.id === id ? { ...entry, ...update } : entry,
    );
  }

  function clearEntries() {
    entries.value = [];
  }

  return {
    entries,
    addEntry,
    updateEntry,
    clearEntries,
  };
}

// Singleton instance
const queryLog = {
  entries,
  addEntry: null as ReturnType<typeof useQueryLog>["addEntry"] | null,
  updateEntry: null as ReturnType<typeof useQueryLog>["updateEntry"] | null,
  clearEntries: null as ReturnType<typeof useQueryLog>["clearEntries"] | null,
};

// Initialize on first call
export function getQueryLog() {
  if (!queryLog.addEntry) {
    const log = useQueryLog();
    queryLog.addEntry = log.addEntry;
    queryLog.updateEntry = log.updateEntry;
    queryLog.clearEntries = log.clearEntries;
  }
  return queryLog as {
    entries: typeof entries;
    addEntry: ReturnType<typeof useQueryLog>["addEntry"];
    updateEntry: ReturnType<typeof useQueryLog>["updateEntry"];
    clearEntries: ReturnType<typeof useQueryLog>["clearEntries"];
  };
}

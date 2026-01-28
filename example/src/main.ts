import "@mdi/font/css/materialdesignicons.css";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { PiniaColada } from "@pinia/colada";
import { PiniaColadaGraphQL } from "@pinia-colada-graphql/core";
import App from "./App.vue";
import { createMockFetch } from "./mock-server";
import { getQueryLog } from "./stores/query-log";

const app = createApp(App);
const pinia = createPinia();

// Query log for dev tools
const queryLog = getQueryLog();
const pendingQueries = new Map<string, { id: string; startTime: number }>();

app.use(pinia);
app.use(PiniaColada);
app.use(PiniaColadaGraphQL, {
  client: {
    url: "/graphql",
    fetch: createMockFetch(),
    interceptors: {
      onRequest(context) {
        const logId = queryLog.addEntry(context.document, context.variables);
        pendingQueries.set(context.operationName ?? "anonymous", {
          id: logId,
          startTime: Date.now(),
        });
      },
      onResponse(context) {
        const pending = pendingQueries.get(context.operationName ?? "anonymous");
        if (pending) {
          queryLog.updateEntry(pending.id, {
            status: context.response.errors?.length ? "error" : "success",
            duration: Date.now() - pending.startTime,
            response: context.response.data,
            error: context.response.errors?.map((e) => e.message).join(", ") ?? null,
          });
          pendingQueries.delete(context.operationName ?? "anonymous");
        }
        return context.response;
      },
      onError(context) {
        const pending = pendingQueries.get(context.operationName ?? "anonymous");
        if (pending) {
          queryLog.updateEntry(pending.id, {
            status: "error",
            duration: Date.now() - pending.startTime,
            error: context.error.message,
          });
          pendingQueries.delete(context.operationName ?? "anonymous");
        }
        return context.error;
      },
    },
  },
  typePolicies: {
    User: {
      keyFields: ["id"],
    },
    Post: {
      keyFields: ["id"],
    },
  },
});

app.mount("#app");

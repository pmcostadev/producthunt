import { z } from "zod";
import { fail, ok, phQuery } from "../ph";
import { READ_ONLY, type Registrar } from "./shared";

export function registerRawTool(server: Registrar) {
  server.registerTool(
    "ph_graphql",
    {
      title: "Raw GraphQL query",
      description:
        "Escape hatch: run an arbitrary read-only GraphQL query against Product Hunt API v2. Use only when the typed tools cannot express what you need. Mutations are blocked. Schema reference: https://github.com/producthunt/producthunt-api/blob/master/schema.graphql",
      inputSchema: z.object({
        query: z.string().describe("A GraphQL query document."),
        variables: z.record(z.string(), z.any()).optional().describe("Variables for the query."),
      }),
      annotations: READ_ONLY,
    },
    async ({ query, variables }) => {
      try {
        // Block mutations, including the shorthand and aliased forms.
        if (/(^|[\s{()])mutation[\s({]/i.test(query) || /^\s*mutation/i.test(query)) {
          return fail(
            new Error(
              "This server is read-only, so mutations are blocked. Product Hunt also requires manual approval for write scopes."
            )
          );
        }
        return ok(await phQuery(query, variables ?? {}));
      } catch (e) {
        return fail(e);
      }
    }
  );
}

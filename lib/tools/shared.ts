import { z } from "zod";

/**
 * Minimal shape of the MCP server object we register against. Typed loosely so
 * the tool modules don't depend on the SDK's exported types.
 */
export type Registrar = {
  registerTool: (
    name: string,
    config: {
      title?: string;
      description: string;
      inputSchema: z.ZodTypeAny;
      annotations?: Record<string, unknown>;
    },
    handler: (args: any) => Promise<any>
  ) => unknown;
};

/** Every tool here is a read. Advertise that so clients can auto-approve. */
export const READ_ONLY = { readOnlyHint: true, openWorldHint: true } as const;

export const pageSize = (max = 50, def = 10) =>
  z.number().int().min(1).max(max).default(def).describe(`How many to return (max ${max}).`);

export const cursor = z
  .string()
  .optional()
  .describe("Pass pageInfo.endCursor from a previous call to get the next page.");

/** Collapse a topics connection into a list of slugs. */
export function topicSlugs(conn: any): string[] {
  return (conn?.edges ?? []).map((e: any) => e.node.slug);
}

/** Trim a post node for output: topics become slugs. */
export function slimPost(p: any) {
  if (!p) return p;
  const { topics, ...rest } = p;
  return { ...rest, topics: topicSlugs(topics) };
}

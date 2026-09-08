import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { extractToken, fail, nodes, ok, phQuery, phStore } from "@/lib/ph";
import {
  GET_POSTS,
  GET_POST_BY_ID,
  GET_POST_BY_SLUG,
  GET_POST_COMMENTS,
  GET_TOPICS,
  GET_USER,
  GET_VIEWER,
} from "@/lib/queries";

// node:async_hooks needs the Node runtime, not Edge.
export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "ph_get_posts",
      {
        title: "Get Product Hunt launches",
        description:
          "List Product Hunt launches. Use this for 'what launched today', trending products, or launches in a date range or topic. Returns name, tagline, votes, comments, topics and URLs.",
        inputSchema: z.object({
          first: z.number().int().min(1).max(50).default(10).describe("How many launches to return (max 50)."),
          order: z
            .enum(["RANKING", "NEWEST", "VOTES", "FEATURED_AT"])
            .default("RANKING")
            .describe("RANKING is the daily leaderboard order. VOTES is all-time popularity."),
          postedAfter: z.string().optional().describe("ISO 8601 datetime lower bound, e.g. 2026-09-01T00:00:00Z"),
          postedBefore: z.string().optional().describe("ISO 8601 datetime upper bound."),
          topic: z.string().optional().describe("Topic slug to filter by, e.g. 'artificial-intelligence'."),
          featured: z.boolean().optional().describe("Only launches featured on the homepage."),
          after: z.string().optional().describe("Cursor from a previous call's pageInfo.endCursor."),
        }),
      },
      async (args) => {
        try {
          const data = await phQuery<any>(GET_POSTS, { ...args });
          return ok({
            totalCount: data.posts.totalCount,
            pageInfo: data.posts.pageInfo,
            posts: nodes<any>(data.posts).map((p: any) => ({
              ...p,
              topics: nodes<any>(p.topics).map((t: any) => t.slug),
            })),
          });
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "ph_get_post",
      {
        title: "Get one Product Hunt launch",
        description:
          "Get full detail for one Product Hunt launch by slug or id, including makers and description. Use after ph_get_posts to dig into a specific product.",
        inputSchema: z.object({
          slug: z.string().optional().describe("Product slug from the URL, e.g. 'notion'."),
          id: z.string().optional().describe("Numeric post id. Use this or slug."),
        }),
      },
      async ({ slug, id }) => {
        try {
          if (!slug && !id) return fail(new Error("Pass either slug or id."));
          const data = slug
            ? await phQuery<any>(GET_POST_BY_SLUG, { slug })
            : await phQuery<any>(GET_POST_BY_ID, { id });
          if (!data.post) return fail(new Error("No launch found for that slug or id."));
          return ok({ ...data.post, topics: nodes<any>(data.post.topics).map((t: any) => t.slug) });
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "ph_get_post_comments",
      {
        title: "Read launch comments",
        description:
          "Read the comment thread on a Product Hunt launch. Useful for gauging real reception and feature requests.",
        inputSchema: z.object({
          slug: z.string().describe("Product slug from the URL."),
          first: z.number().int().min(1).max(50).default(20),
          after: z.string().optional().describe("Cursor for the next page."),
        }),
      },
      async (args) => {
        try {
          const data = await phQuery<any>(GET_POST_COMMENTS, { ...args });
          if (!data.post) return fail(new Error("No launch found for that slug."));
          return ok({
            post: data.post.name,
            totalCount: data.post.comments.totalCount,
            pageInfo: data.post.comments.pageInfo,
            comments: nodes<any>(data.post.comments),
          });
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "ph_search_topics",
      {
        title: "Search Product Hunt topics",
        description:
          "Search Product Hunt topics (categories) by name. Returns topic slugs you can feed into ph_get_posts to filter launches by category.",
        inputSchema: z.object({
          query: z.string().optional().describe("Free-text topic search, e.g. 'developer tools'."),
          first: z.number().int().min(1).max(50).default(15),
          after: z.string().optional(),
        }),
      },
      async (args) => {
        try {
          const data = await phQuery<any>(GET_TOPICS, { ...args });
          return ok({
            totalCount: data.topics.totalCount,
            pageInfo: data.topics.pageInfo,
            topics: nodes<any>(data.topics),
          });
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "ph_get_user",
      {
        title: "Get a Product Hunt user",
        description:
          "Look up a Product Hunt user or maker by username. Returns their profile, follower counts, and recent launches.",
        inputSchema: z.object({
          username: z.string().describe("Product Hunt username, without the @."),
        }),
      },
      async ({ username }) => {
        try {
          const data = await phQuery<any>(GET_USER, { username });
          if (!data.user) return fail(new Error("No user found with that username."));
          return ok({ ...data.user, madePosts: nodes<any>(data.user.madePosts) });
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "ph_whoami",
      {
        title: "Verify the Product Hunt token",
        description:
          "Return the Product Hunt account the current token belongs to. Use this to verify the connection works. Requires a user-scoped token; client-credentials tokens have no viewer.",
        inputSchema: z.object({}),
      },
      async () => {
        try {
          const data = await phQuery<any>(GET_VIEWER);
          return ok(
            data.viewer?.user ?? {
              note: "Token is valid but has no user context (client-credentials scope).",
            }
          );
        } catch (e) {
          return fail(e);
        }
      }
    );

    server.registerTool(
      "ph_graphql",
      {
        title: "Raw Product Hunt GraphQL query",
        description:
          "Escape hatch: run an arbitrary read-only GraphQL query against the Product Hunt API v2. Use only when the typed tools above cannot express what you need. Schema: https://github.com/producthunt/producthunt-api/blob/master/schema.graphql",
        inputSchema: z.object({
          query: z.string().describe("A GraphQL query document."),
          variables: z
            .record(z.string(), z.any())
            .optional()
            .describe("Variables object for the query."),
        }),
      },
      async ({ query, variables }) => {
        try {
          if (/\bmutation\b/i.test(query)) {
            return fail(new Error("This server is read-only. Mutations are blocked."));
          }
          return ok(await phQuery(query, variables ?? {}));
        } catch (e) {
          return fail(e);
        }
      }
    );
  },
  {
    serverInfo: { name: "producthunt-mcp", version: "1.0.1" },
  }
);

/**
 * Capture the caller's Product Hunt token for the lifetime of this request,
 * then hand off to the MCP handler. Nothing is persisted between requests.
 */
async function withPhAuth(req: Request): Promise<Response> {
  return phStore.run({ token: extractToken(req) }, () => handler(req));
}

export { withPhAuth as GET, withPhAuth as POST };

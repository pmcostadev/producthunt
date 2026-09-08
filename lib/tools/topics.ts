import { z } from "zod";
import { fail, nodes, ok, phQuery } from "../ph";
import { GET_COLLECTION, GET_COLLECTIONS, GET_TOPIC, GET_TOPICS } from "../queries";
import { READ_ONLY, cursor, pageSize, slimPost, topicSlugs, type Registrar } from "./shared";

export function registerTopicTools(server: Registrar) {
  server.registerTool(
    "ph_search_topics",
    {
      title: "Search topics",
      description:
        "Search Product Hunt topics (categories). Returns the slugs you feed into ph_get_posts to filter launches by category. Can also list topics a specific user follows.",
      inputSchema: z.object({
        query: z.string().optional().describe("Free-text search, e.g. 'developer tools'."),
        order: z.enum(["FOLLOWERS_COUNT", "NEWEST"]).default("FOLLOWERS_COUNT"),
        followedByUserId: z.string().optional().describe("Only topics followed by this user id."),
        first: pageSize(50, 15),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_TOPICS, { ...args });
        return ok({
          totalCount: d.topics.totalCount,
          pageInfo: d.topics.pageInfo,
          topics: nodes(d.topics),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_topic",
    {
      title: "Get one topic",
      description:
        "Detail for a single topic by slug or id, including follower and post counts, and whether the connected account follows it. Use the counts to judge how much reach a category has.",
      inputSchema: z.object({
        slug: z.string().optional().describe("Topic slug, e.g. 'artificial-intelligence'."),
        id: z.string().optional().describe("Topic id. Use this or slug."),
      }),
      annotations: READ_ONLY,
    },
    async ({ slug, id }) => {
      try {
        if (!slug && !id) return fail(new Error("Pass either slug or id."));
        const d = await phQuery<any>(GET_TOPIC, { slug, id });
        if (!d.topic) return fail(new Error("No topic found."));
        return ok(d.topic);
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_search_collections",
    {
      title: "Search collections",
      description:
        "List curated collections. Filter to those containing a given post, or curated by a given user. Sort by follower count to find the collections worth getting into.",
      inputSchema: z.object({
        order: z.enum(["FOLLOWERS_COUNT", "FEATURED_AT", "NEWEST"]).default("FOLLOWERS_COUNT"),
        featured: z.boolean().optional().describe("Featured collections only."),
        postId: z.string().optional().describe("Only collections containing this post id."),
        userId: z.string().optional().describe("Only collections created by this user id."),
        first: pageSize(50, 15),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_COLLECTIONS, { ...args });
        return ok({
          totalCount: d.collections.totalCount,
          pageInfo: d.collections.pageInfo,
          collections: nodes(d.collections),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_collection",
    {
      title: "Get a collection and its launches",
      description:
        "Detail for one collection by slug or id, plus the launches inside it. Good for mining a curated list in your category.",
      inputSchema: z.object({
        slug: z.string().optional().describe("Collection slug."),
        id: z.string().optional().describe("Collection id. Use this or slug."),
        first: pageSize(50, 20),
      }),
      annotations: READ_ONLY,
    },
    async ({ slug, id, first }) => {
      try {
        if (!slug && !id) return fail(new Error("Pass either slug or id."));
        const d = await phQuery<any>(GET_COLLECTION, { slug, id, first });
        if (!d.collection) return fail(new Error("No collection found."));
        const { posts, topics, ...c } = d.collection;
        return ok({
          ...c,
          topics: topicSlugs(topics),
          postsTotal: posts.totalCount,
          pageInfo: posts.pageInfo,
          posts: nodes<any>(posts).map(slimPost),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );
}

import { z } from "zod";
import { fail, nodes, ok, phQuery } from "../ph";
import {
  GET_COMMENT_THREAD,
  GET_POSTS,
  GET_POST_BY_ID,
  GET_POST_BY_SLUG,
  GET_POST_COLLECTIONS,
  GET_POST_COMMENTS,
  GET_POST_VOTES,
} from "../queries";
import { READ_ONLY, cursor, pageSize, slimPost, type Registrar } from "./shared";

export function registerPostTools(server: Registrar) {
  server.registerTool(
    "ph_get_posts",
    {
      title: "Get Product Hunt launches",
      description:
        "List Product Hunt launches. Use for 'what launched today', trending products, launches in a date range or topic, or finding a launch by its Twitter URL. Returns name, tagline, votes, comments, rating and topics.",
      inputSchema: z.object({
        first: pageSize(50, 10),
        order: z
          .enum(["RANKING", "NEWEST", "VOTES", "FEATURED_AT"])
          .default("RANKING")
          .describe(
            "RANKING is the daily leaderboard order. VOTES is all-time popularity. FEATURED_AT is most recently featured."
          ),
        postedAfter: z
          .string()
          .optional()
          .describe("ISO 8601 lower bound, e.g. 2026-09-01T00:00:00Z"),
        postedBefore: z.string().optional().describe("ISO 8601 upper bound."),
        topic: z
          .string()
          .optional()
          .describe("Topic slug, e.g. 'artificial-intelligence'. Find slugs with ph_search_topics."),
        twitterUrl: z.string().optional().describe("Find launches carrying this Twitter URL."),
        featured: z
          .boolean()
          .optional()
          .describe("true = homepage-featured only. false = launches that were never featured."),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_POSTS, { ...args });
        return ok({
          totalCount: d.posts.totalCount,
          pageInfo: d.posts.pageInfo,
          posts: nodes<any>(d.posts).map(slimPost),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_post",
    {
      title: "Get one launch in full",
      description:
        "Full detail for a single launch by slug or id: description, makers, media, topics, and (with a connected account) whether you voted for it or collected it.",
      inputSchema: z.object({
        slug: z.string().optional().describe("Slug from the product URL, e.g. 'notion'."),
        id: z.string().optional().describe("Numeric post id. Use this or slug."),
      }),
      annotations: READ_ONLY,
    },
    async ({ slug, id }) => {
      try {
        if (!slug && !id) return fail(new Error("Pass either slug or id."));
        const d = slug
          ? await phQuery<any>(GET_POST_BY_SLUG, { slug })
          : await phQuery<any>(GET_POST_BY_ID, { id });
        if (!d.post) return fail(new Error("No launch found for that slug or id."));
        return ok(slimPost(d.post));
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
        "Read the comment thread on a launch. Order by VOTES_COUNT to surface the most-agreed-with feedback, which is where feature requests and complaints live.",
      inputSchema: z.object({
        slug: z.string().describe("Slug from the product URL."),
        first: pageSize(50, 20),
        order: z.enum(["NEWEST", "VOTES_COUNT"]).default("VOTES_COUNT"),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_POST_COMMENTS, { ...args });
        if (!d.post) return fail(new Error("No launch found for that slug."));
        return ok({
          post: d.post.name,
          totalCount: d.post.comments.totalCount,
          pageInfo: d.post.comments.pageInfo,
          comments: nodes(d.post.comments),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_comment_thread",
    {
      title: "Read a comment and its replies",
      description:
        "Expand one comment into its full reply thread. Use after ph_get_post_comments when a comment has replies worth reading.",
      inputSchema: z.object({
        id: z.string().describe("Comment id from ph_get_post_comments."),
        first: pageSize(50, 20),
        order: z.enum(["NEWEST", "VOTES_COUNT"]).default("NEWEST"),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_COMMENT_THREAD, { ...args });
        if (!d.comment) return fail(new Error("No comment found with that id."));
        const { replies, ...c } = d.comment;
        return ok({
          comment: c,
          totalReplies: replies.totalCount,
          pageInfo: replies.pageInfo,
          replies: nodes(replies),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_vote_velocity",
    {
      title: "Measure how fast a launch gained votes",
      description:
        "Pull individual vote timestamps for a launch and bucket them by hour, so you can see how fast it climbed on launch day. Use this to benchmark what a winning launch curve looks like before running your own. Costs more rate-limit budget than other tools, so keep maxVotes modest.",
      inputSchema: z.object({
        slug: z.string().describe("Slug from the product URL."),
        maxVotes: z
          .number()
          .int()
          .min(20)
          .max(1000)
          .default(300)
          .describe("How many votes to sample, newest first. Higher costs more rate limit."),
        bucketHours: z
          .number()
          .int()
          .min(1)
          .max(24)
          .default(1)
          .describe("Size of each time bucket, in hours."),
        createdAfter: z.string().optional().describe("Only count votes after this ISO 8601 time."),
        createdBefore: z.string().optional().describe("Only count votes before this ISO 8601 time."),
      }),
      annotations: READ_ONLY,
    },
    async ({ slug, maxVotes, bucketHours, createdAfter, createdBefore }) => {
      try {
        const times: string[] = [];
        let after: string | undefined;
        let meta: any = null;

        while (times.length < maxVotes) {
          const page = Math.min(50, maxVotes - times.length);
          const d = await phQuery<any>(GET_POST_VOTES, {
            slug,
            first: page,
            after,
            createdAfter,
            createdBefore,
          });
          if (!d.post) return fail(new Error("No launch found for that slug."));
          meta ??= {
            post: d.post.name,
            totalVotes: d.post.votesCount,
            featuredAt: d.post.featuredAt,
            createdAt: d.post.createdAt,
          };
          for (const v of nodes<any>(d.post.votes)) times.push(v.createdAt);
          if (!d.post.votes.pageInfo.hasNextPage) break;
          after = d.post.votes.pageInfo.endCursor;
        }

        if (times.length === 0) {
          return ok({ ...meta, sampled: 0, note: "No votes in that window." });
        }

        const ms = times.map((t) => new Date(t).getTime()).sort((a, b) => a - b);
        const origin = meta.featuredAt ? new Date(meta.featuredAt).getTime() : ms[0];
        const width = bucketHours * 3600_000;

        const counts = new Map<number, number>();
        for (const t of ms) {
          const b = Math.floor((t - origin) / width);
          counts.set(b, (counts.get(b) ?? 0) + 1);
        }

        const sorted = [...counts.entries()].sort((a, b) => a[0] - b[0]);
        let running = 0;
        const buckets = sorted.map(([b, n]) => {
          running += n;
          return {
            hoursFromFeature: b * bucketHours,
            votes: n,
            cumulative: running,
          };
        });

        const peak = sorted.reduce((m, c) => (c[1] > m[1] ? c : m), sorted[0]);
        const spanH = (ms[ms.length - 1] - ms[0]) / 3600_000;

        return ok({
          ...meta,
          sampled: times.length,
          sampleIsPartial: times.length < meta.totalVotes,
          firstVoteAt: new Date(ms[0]).toISOString(),
          lastVoteAt: new Date(ms[ms.length - 1]).toISOString(),
          spanHours: Number(spanH.toFixed(2)),
          votesPerHour: spanH > 0 ? Number((times.length / spanH).toFixed(2)) : null,
          peakBucket: { hoursFromFeature: peak[0] * bucketHours, votes: peak[1] },
          bucketHours,
          buckets,
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_post_collections",
    {
      title: "Which collections feature a launch",
      description:
        "List the curated collections a launch appears in. Useful for finding the curators and lists that cover your category.",
      inputSchema: z.object({
        slug: z.string().describe("Slug from the product URL."),
        first: pageSize(50, 15),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_POST_COLLECTIONS, { ...args });
        if (!d.post) return fail(new Error("No launch found for that slug."));
        return ok({
          post: d.post.name,
          totalCount: d.post.collections.totalCount,
          pageInfo: d.post.collections.pageInfo,
          collections: nodes(d.post.collections),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );
}

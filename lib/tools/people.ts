import { z } from "zod";
import { fail, nodes, ok, phQuery } from "../ph";
import {
  CHECK_USER_FOLLOW,
  GET_USER,
  GET_USER_COLLECTIONS,
  GET_USER_FOLLOWERS,
  GET_USER_FOLLOWING,
  GET_USER_POSTS,
  GET_USER_SUBMITTED,
  GET_USER_VOTED,
} from "../queries";
import { READ_ONLY, cursor, pageSize, slimPost, type Registrar } from "./shared";

export function registerPeopleTools(server: Registrar) {
  server.registerTool(
    "ph_get_user",
    {
      title: "Get a Product Hunt profile",
      description:
        "Look up a user or maker by username (or id). Returns profile, follower counts, and a preview of what they made and submitted.",
      inputSchema: z.object({
        username: z.string().optional().describe("Username without the @."),
        id: z.string().optional().describe("Numeric user id. Use this or username."),
      }),
      annotations: READ_ONLY,
    },
    async ({ username, id }) => {
      try {
        if (!username && !id) return fail(new Error("Pass either username or id."));
        const d = await phQuery<any>(GET_USER, { username, id });
        if (!d.user) return fail(new Error("No user found."));
        return ok({
          ...d.user,
          followers: d.user.followers?.totalCount,
          following: d.user.following?.totalCount,
          madePosts: nodes(d.user.madePosts),
          madePostsTotal: d.user.madePosts?.totalCount,
          submittedPosts: nodes(d.user.submittedPosts),
          submittedPostsTotal: d.user.submittedPosts?.totalCount,
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_user_posts",
    {
      title: "Launches by a maker",
      description:
        "Paginate a user's launches. 'made' = they are credited as a maker, 'submitted' = they posted it, 'voted' = launches they upvoted. Voted history is the best read on someone's taste.",
      inputSchema: z.object({
        username: z.string().describe("Username without the @."),
        kind: z.enum(["made", "submitted", "voted"]).default("made"),
        first: pageSize(50, 20),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async ({ username, kind, first, after }) => {
      try {
        const doc =
          kind === "made"
            ? GET_USER_POSTS
            : kind === "submitted"
              ? GET_USER_SUBMITTED
              : GET_USER_VOTED;
        const d = await phQuery<any>(doc, { username, first, after });
        if (!d.user) return fail(new Error("No user found with that username."));
        const conn = d.user.madePosts ?? d.user.submittedPosts ?? d.user.votedPosts;
        return ok({
          username: d.user.username,
          kind,
          totalCount: conn.totalCount,
          pageInfo: conn.pageInfo,
          posts: nodes<any>(conn).map(slimPost),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_user_network",
    {
      title: "Followers and following",
      description:
        "Paginate who follows a user, or who they follow. With a connected account each person also shows whether you follow them.",
      inputSchema: z.object({
        username: z.string().describe("Username without the @."),
        direction: z.enum(["followers", "following"]).default("followers"),
        first: pageSize(50, 25),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async ({ username, direction, first, after }) => {
      try {
        const doc = direction === "followers" ? GET_USER_FOLLOWERS : GET_USER_FOLLOWING;
        const d = await phQuery<any>(doc, { username, first, after });
        if (!d.user) return fail(new Error("No user found with that username."));
        const conn = d.user.followers ?? d.user.following;
        return ok({
          username: d.user.username,
          direction,
          totalCount: conn.totalCount,
          pageInfo: conn.pageInfo,
          people: nodes(conn),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_user_followed_collections",
    {
      title: "Collections a user follows",
      description: "List the curated collections a user follows. A signal of what they care about.",
      inputSchema: z.object({
        username: z.string().describe("Username without the @."),
        first: pageSize(50, 20),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_USER_COLLECTIONS, { ...args });
        if (!d.user) return fail(new Error("No user found with that username."));
        return ok({
          username: d.user.username,
          totalCount: d.user.followedCollections.totalCount,
          pageInfo: d.user.followedCollections.pageInfo,
          collections: nodes(d.user.followedCollections),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_check_user_follow",
    {
      title: "Do I follow this person?",
      description:
        "Check whether the connected account follows a given user. Requires an OAuth-connected account (private scope); a plain developer token has no viewer context.",
      inputSchema: z.object({ username: z.string().describe("Username without the @.") }),
      annotations: READ_ONLY,
    },
    async ({ username }) => {
      try {
        const d = await phQuery<any>(CHECK_USER_FOLLOW, { username });
        if (!d.user) return fail(new Error("No user found with that username."));
        return ok(d.user);
      } catch (e) {
        return fail(e);
      }
    }
  );
}

import { z } from "zod";
import { fail, nodes, ok, phQuery } from "../ph";
import {
  CHECK_POST_ENGAGEMENT,
  GET_GOAL,
  GET_GOALS,
  GET_MAKER_GROUP,
  GET_MAKER_GROUPS,
  GET_MY_GOALS,
  GET_MY_SPACES,
  GET_VIEWER,
} from "../queries";
import { READ_ONLY, cursor, pageSize, type Registrar } from "./shared";

const NEEDS_PRIVATE =
  "Requires an account connected through OAuth (private scope). A plain developer token has no viewer context and will fail here.";

export function registerViewerTools(server: Registrar) {
  server.registerTool(
    "ph_whoami",
    {
      title: "Who is connected",
      description:
        "Return the Product Hunt account this request is authenticated as. Start here when debugging: it proves the credential works and tells you whether you have user context.",
      inputSchema: z.object({}),
      annotations: READ_ONLY,
    },
    async () => {
      try {
        const d = await phQuery<any>(GET_VIEWER);
        const u = d.viewer?.user;
        if (!u) {
          return ok({
            authenticated: true,
            userContext: false,
            note: "The credential is valid but carries no user context, so private data is unavailable. Connect an account through OAuth for that.",
          });
        }
        return ok({
          authenticated: true,
          userContext: true,
          ...u,
          followers: u.followers?.totalCount,
          following: u.following?.totalCount,
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_my_goals",
    {
      title: "My goals",
      description: `List the connected account's own maker goals, including private ones. ${NEEDS_PRIVATE}`,
      inputSchema: z.object({
        current: z.boolean().optional().describe("true = only the goals set as current."),
        order: z.enum(["NEWEST", "DUE_AT", "COMPLETED_AT"]).default("NEWEST"),
        first: pageSize(50, 20),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_MY_GOALS, { ...args });
        if (!d.viewer) return fail(new Error(NEEDS_PRIVATE));
        return ok({
          user: d.viewer.user?.username,
          totalCount: d.viewer.goals.totalCount,
          pageInfo: d.viewer.goals.pageInfo,
          goals: nodes(d.viewer.goals),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_my_spaces",
    {
      title: "My Spaces and projects",
      description: `List the maker groups (Spaces) the connected account belongs to and the maker projects they maintain, including unlisted ones. ${NEEDS_PRIVATE}`,
      inputSchema: z.object({ first: pageSize(50, 20) }),
      annotations: READ_ONLY,
    },
    async ({ first }) => {
      try {
        const d = await phQuery<any>(GET_MY_SPACES, { first });
        if (!d.viewer) return fail(new Error(NEEDS_PRIVATE));
        return ok({
          user: d.viewer.user?.username,
          spacesTotal: d.viewer.makerGroups.totalCount,
          spaces: nodes(d.viewer.makerGroups),
          projectsTotal: d.viewer.makerProjects.totalCount,
          projects: nodes(d.viewer.makerProjects),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_check_engagement",
    {
      title: "Did I vote for this?",
      description: `For a given launch, report whether the connected account upvoted it, collected it, and follows its topics. This is how you tell whether specific people actually showed up for a launch. ${NEEDS_PRIVATE}`,
      inputSchema: z.object({ slug: z.string().describe("Slug from the product URL.") }),
      annotations: READ_ONLY,
    },
    async ({ slug }) => {
      try {
        const d = await phQuery<any>(CHECK_POST_ENGAGEMENT, { slug });
        if (!d.post) return fail(new Error("No launch found for that slug."));
        const { topics, ...p } = d.post;
        return ok({ ...p, topics: (topics?.edges ?? []).map((e: any) => e.node) });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_goals",
    {
      title: "Search public goals",
      description:
        "Search maker goals across Product Hunt: by user, Space, project, or completion state. Public goals only unless they belong to the connected account.",
      inputSchema: z.object({
        userId: z.string().optional().describe("Only goals created by this user id."),
        makerGroupId: z.string().optional().describe("Only goals in this Space."),
        makerProjectId: z.string().optional().describe("Only goals in this project."),
        completed: z.boolean().optional().describe("Filter by completion state."),
        order: z.enum(["NEWEST", "DUE_AT", "COMPLETED_AT"]).default("NEWEST"),
        first: pageSize(50, 20),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async (args) => {
      try {
        const d = await phQuery<any>(GET_GOALS, { ...args });
        return ok({
          totalCount: d.goals.totalCount,
          pageInfo: d.goals.pageInfo,
          goals: nodes(d.goals),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_get_goal",
    {
      title: "Get one goal",
      description: "Detail for a single goal by id, including cheers and which Space it belongs to.",
      inputSchema: z.object({ id: z.string().describe("Goal id.") }),
      annotations: READ_ONLY,
    },
    async ({ id }) => {
      try {
        const d = await phQuery<any>(GET_GOAL, { id });
        if (!d.goal) return fail(new Error("No goal found with that id."));
        return ok(d.goal);
      } catch (e) {
        return fail(e);
      }
    }
  );

  server.registerTool(
    "ph_maker_groups",
    {
      title: "Browse Spaces",
      description:
        "List maker groups (Spaces) on Product Hunt, or fetch one by id. Filter to the Spaces a given user belongs to. Sort by activity to find the live ones.",
      inputSchema: z.object({
        id: z.string().optional().describe("Fetch a single Space by id."),
        userId: z.string().optional().describe("Only Spaces this user is an accepted member of."),
        order: z
          .enum(["LAST_ACTIVE", "MEMBERS_COUNT", "GOALS_COUNT", "NEWEST"])
          .default("LAST_ACTIVE"),
        first: pageSize(50, 20),
        after: cursor,
      }),
      annotations: READ_ONLY,
    },
    async ({ id, userId, order, first, after }) => {
      try {
        if (id) {
          const d = await phQuery<any>(GET_MAKER_GROUP, { id });
          if (!d.makerGroup) return fail(new Error("No Space found with that id."));
          return ok(d.makerGroup);
        }
        const d = await phQuery<any>(GET_MAKER_GROUPS, { userId, order, first, after });
        return ok({
          totalCount: d.makerGroups.totalCount,
          pageInfo: d.makerGroups.pageInfo,
          spaces: nodes(d.makerGroups),
        });
      } catch (e) {
        return fail(e);
      }
    }
  );
}

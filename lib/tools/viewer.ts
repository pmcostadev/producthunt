import { z } from "zod";
import { fail, ok, phQuery } from "../ph";
import { CHECK_POST_ENGAGEMENT, GET_VIEWER } from "../queries";
import { READ_ONLY, type Registrar } from "./shared";

/**
 * Tools that depend on who is connected.
 *
 * Five tools were removed from this file: ph_my_goals, ph_my_spaces,
 * ph_get_goals, ph_get_goal and ph_maker_groups. Product Hunt's maker-goals
 * feature no longer exists on the live API, which answers
 * "Field 'goals' doesn't exist on type 'Query'" and
 * "Field 'makerGroups' doesn't exist on type 'Viewer'". The published
 * schema.graphql still documents all of it, which is what led them to be
 * written in the first place.
 */

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
}

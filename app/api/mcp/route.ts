import { createMcpHandler } from "mcp-handler";
import { extractToken, phStore } from "@/lib/ph";
import { registerPostTools } from "@/lib/tools/posts";
import { registerPeopleTools } from "@/lib/tools/people";
import { registerTopicTools } from "@/lib/tools/topics";
import { registerViewerTools } from "@/lib/tools/viewer";
import { registerRawTool } from "@/lib/tools/raw";

// node:async_hooks and node:crypto need the Node runtime, not Edge.
export const runtime = "nodejs";
export const maxDuration = 60;

const handler = createMcpHandler(
  (server) => {
    registerPostTools(server as any);
    registerPeopleTools(server as any);
    registerTopicTools(server as any);
    registerViewerTools(server as any);
    registerRawTool(server as any);
  },
  {
    serverInfo: { name: "producthunt-mcp", version: "2.0.0" },
  }
);

/**
 * Resolve the caller's Product Hunt credential for the lifetime of this request,
 * then hand off to the MCP handler. Nothing is persisted between requests.
 */
async function withPhAuth(req: Request): Promise<Response> {
  return phStore.run({ token: extractToken(req) }, () => handler(req));
}

export { withPhAuth as GET, withPhAuth as POST };

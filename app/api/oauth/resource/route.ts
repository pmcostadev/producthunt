import { originOf } from "@/lib/seal";

export const runtime = "nodejs";

/**
 * RFC 9728 Protected Resource Metadata.
 * Served at /.well-known/oauth-protected-resource. Points MCP clients at the
 * authorization server that guards this MCP endpoint (which is us).
 */
export async function GET(req: Request) {
  const origin = originOf(req);
  return Response.json(
    {
      resource: `${origin}/api/mcp`,
      authorization_servers: [origin],
      scopes_supported: ["public", "private"],
      bearer_methods_supported: ["header"],
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

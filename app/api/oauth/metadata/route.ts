import { originOf } from "@/lib/seal";

export const runtime = "nodejs";

/**
 * RFC 8414 Authorization Server Metadata.
 * Served at /.well-known/oauth-authorization-server via a rewrite in next.config.js.
 * This is the document Composio fetches first; the presence of registration_endpoint
 * is what tells it Dynamic Client Registration is available.
 */
export async function GET(req: Request) {
  const origin = originOf(req);
  return Response.json(
    {
      issuer: origin,
      authorization_endpoint: `${origin}/api/oauth/authorize`,
      token_endpoint: `${origin}/api/oauth/token`,
      registration_endpoint: `${origin}/api/oauth/register`,
      scopes_supported: ["public", "private"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"],
      code_challenge_methods_supported: ["S256"],
      service_documentation: "https://github.com/pmcostadev/producthunt-mcp",
    },
    { headers: { "Cache-Control": "public, max-age=3600" } }
  );
}

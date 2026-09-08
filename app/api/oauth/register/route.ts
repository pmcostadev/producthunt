import { seal } from "@/lib/seal";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * RFC 7591 Dynamic Client Registration.
 *
 * Rather than persisting a client record, we encrypt the client's own metadata
 * into the client_id we hand back. Presenting that client_id later is proof of
 * what it registered, so /authorize can validate redirect_uri with no lookup.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json(
      { error: "invalid_client_metadata", error_description: "Body must be JSON." },
      { status: 400, headers: CORS }
    );
  }

  const redirectUris: unknown = body?.redirect_uris;
  if (!Array.isArray(redirectUris) || redirectUris.length === 0) {
    return Response.json(
      {
        error: "invalid_redirect_uri",
        error_description: "redirect_uris is required and must be a non-empty array.",
      },
      { status: 400, headers: CORS }
    );
  }

  for (const uri of redirectUris) {
    if (typeof uri !== "string") {
      return Response.json(
        { error: "invalid_redirect_uri", error_description: "Each redirect_uri must be a string." },
        { status: 400, headers: CORS }
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      return Response.json(
        { error: "invalid_redirect_uri", error_description: `Not a valid URL: ${uri}` },
        { status: 400, headers: CORS }
      );
    }
    const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !isLocal) {
      return Response.json(
        {
          error: "invalid_redirect_uri",
          error_description: "redirect_uris must use https (localhost may use http).",
        },
        { status: 400, headers: CORS }
      );
    }
  }

  const clientName = typeof body?.client_name === "string" ? body.client_name : "MCP client";
  const issuedAt = Math.floor(Date.now() / 1000);

  const clientId = `phc_${seal("client", {
    ru: redirectUris,
    n: clientName,
    iat: issuedAt,
  })}`;

  // Public client: no secret. PKCE carries the security.
  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: issuedAt,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      scope: "public private",
    },
    { status: 201, headers: { ...CORS, "Cache-Control": "no-store" } }
  );
}

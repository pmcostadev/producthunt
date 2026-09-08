import { ACCESS_PREFIX, seal, unseal, verifyPkce } from "@/lib/seal";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const NO_STORE = { ...CORS, "Cache-Control": "no-store", Pragma: "no-cache" };

const ACCESS_TTL_S = 60 * 60 * 24 * 30; // 30 days

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

function fail(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, { status, headers: NO_STORE });
}

/** Accept both form-encoded (the spec's default) and JSON bodies. */
async function readParams(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      const j = await req.json();
      return Object.fromEntries(
        Object.entries(j ?? {}).map(([k, v]) => [k, typeof v === "string" ? v : String(v)])
      );
    } catch {
      return {};
    }
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text).entries());
}

function issue(phToken: string) {
  const now = Date.now();
  return Response.json(
    {
      access_token:
        ACCESS_PREFIX + seal("access", { t: phToken, exp: now + ACCESS_TTL_S * 1000 }),
      token_type: "Bearer",
      expires_in: ACCESS_TTL_S,
      refresh_token: seal("refresh", { t: phToken }),
      scope: process.env.PH_SCOPES ?? "public private",
    },
    { headers: NO_STORE }
  );
}

export async function POST(req: Request) {
  const p = await readParams(req);
  const grant = p.grant_type;

  if (grant === "refresh_token") {
    if (!p.refresh_token) return fail("invalid_request", "refresh_token is required.");
    try {
      const r = unseal<{ t: string }>("refresh", p.refresh_token);
      return issue(r.t);
    } catch {
      return fail("invalid_grant", "That refresh token is not valid.");
    }
  }

  if (grant !== "authorization_code") {
    return fail(
      "unsupported_grant_type",
      "Only authorization_code and refresh_token are supported."
    );
  }

  if (!p.code) return fail("invalid_request", "code is required.");
  if (!p.code_verifier) return fail("invalid_request", "code_verifier is required.");

  let c: { t: string; cc: string; cru: string; cid: string };
  try {
    c = unseal("code", p.code);
  } catch (e) {
    return fail(
      "invalid_grant",
      `Authorization code is invalid or expired (${e instanceof Error ? e.message : "unknown"}).`
    );
  }

  if (p.client_id && p.client_id !== c.cid) {
    return fail("invalid_grant", "client_id does not match the one that requested this code.");
  }
  if (p.redirect_uri && p.redirect_uri !== c.cru) {
    return fail("invalid_grant", "redirect_uri does not match the authorization request.");
  }
  if (!verifyPkce(p.code_verifier, c.cc)) {
    return fail("invalid_grant", "code_verifier does not match the code_challenge.");
  }

  return issue(c.t);
}

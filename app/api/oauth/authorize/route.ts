import { originOf, seal, unseal } from "@/lib/seal";

export const runtime = "nodejs";

const PH_AUTHORIZE = "https://api.producthunt.com/v2/oauth/authorize";

/** Bounce the user to Product Hunt's real consent screen. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams;

  const clientId = q.get("client_id") ?? "";
  const redirectUri = q.get("redirect_uri") ?? "";
  const responseType = q.get("response_type") ?? "";
  const codeChallenge = q.get("code_challenge") ?? "";
  const method = q.get("code_challenge_method") ?? "";
  const state = q.get("state") ?? "";
  const scope = q.get("scope") ?? process.env.PH_SCOPES ?? "public private";

  // Errors before redirect_uri is validated must be shown, not redirected.
  const bail = (description: string) =>
    new Response(description, {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  if (!clientId.startsWith("phc_")) return bail("Unknown client_id.");

  let client: { ru: string[]; n: string };
  try {
    client = unseal("client", clientId.slice(4));
  } catch {
    return bail("client_id is invalid or was not issued by this server.");
  }

  if (!redirectUri || !client.ru.includes(redirectUri)) {
    return bail("redirect_uri does not match any URI registered for this client.");
  }

  // From here on, protocol errors go back to the client per OAuth 2.1.
  const back = (error: string, description: string) => {
    const to = new URL(redirectUri);
    to.searchParams.set("error", error);
    to.searchParams.set("error_description", description);
    if (state) to.searchParams.set("state", state);
    return Response.redirect(to.toString(), 302);
  };

  if (responseType !== "code") {
    return back("unsupported_response_type", "Only response_type=code is supported.");
  }
  if (!codeChallenge) {
    return back("invalid_request", "code_challenge is required.");
  }
  if (method !== "S256") {
    return back("invalid_request", "code_challenge_method must be S256.");
  }

  if (!process.env.PH_CLIENT_ID || !process.env.PH_CLIENT_SECRET) {
    return back(
      "server_error",
      "This deployment is missing PH_CLIENT_ID / PH_CLIENT_SECRET environment variables."
    );
  }

  // Everything we'll need after Product Hunt redirects back, encrypted into `state`.
  const carried = seal("state", {
    cru: redirectUri,
    cs: state,
    cc: codeChallenge,
    cid: clientId,
    exp: Date.now() + 10 * 60 * 1000,
  });

  const to = new URL(PH_AUTHORIZE);
  to.searchParams.set("client_id", process.env.PH_CLIENT_ID);
  to.searchParams.set("redirect_uri", `${originOf(req)}/api/oauth/callback`);
  to.searchParams.set("response_type", "code");
  to.searchParams.set("scope", scope);
  to.searchParams.set("state", carried);

  return Response.redirect(to.toString(), 302);
}

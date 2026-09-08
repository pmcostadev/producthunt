import { originOf, seal, unseal } from "@/lib/seal";

export const runtime = "nodejs";

const PH_TOKEN = "https://api.producthunt.com/v2/oauth/token";

/**
 * Product Hunt sends the user back here. We swap their code for a real PH access
 * token, then mint our own authorization code (with the PH token sealed inside)
 * and hand that to whoever started the flow.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  const plain = (msg: string, status = 400) =>
    new Response(msg, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

  const carried = q.get("state");
  if (!carried) return plain("Missing state. Start the login again.");

  let st: { cru: string; cs: string; cc: string; cid: string };
  try {
    st = unseal("state", carried);
  } catch {
    return plain("This login link expired or was tampered with. Start again.");
  }

  const back = (params: Record<string, string>) => {
    const to = new URL(st.cru);
    for (const [k, v] of Object.entries(params)) to.searchParams.set(k, v);
    if (st.cs) to.searchParams.set("state", st.cs);
    return Response.redirect(to.toString(), 302);
  };

  const denied = q.get("error");
  if (denied) {
    return back({
      error: denied === "access_denied" ? "access_denied" : "invalid_request",
      error_description: q.get("error_description") ?? "Product Hunt denied the request.",
    });
  }

  const phCode = q.get("code");
  if (!phCode) return back({ error: "invalid_request", error_description: "No code returned." });

  let phToken: string;
  try {
    const res = await fetch(PH_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.PH_CLIENT_ID,
        client_secret: process.env.PH_CLIENT_SECRET,
        redirect_uri: `${originOf(req)}/api/oauth/callback`,
        code: phCode,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const text = await res.text();
    if (!res.ok) {
      return back({
        error: "invalid_grant",
        error_description: `Product Hunt rejected the code exchange (${res.status}): ${text.slice(0, 200)}`,
      });
    }
    const parsed = JSON.parse(text);
    if (!parsed?.access_token) {
      return back({
        error: "invalid_grant",
        error_description: "Product Hunt returned no access_token.",
      });
    }
    phToken = parsed.access_token as string;
  } catch (e) {
    return back({
      error: "server_error",
      error_description: `Could not reach Product Hunt: ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // Our authorization code: short-lived, and bound to the PKCE challenge
  // presented at the /authorize step.
  const code = seal("code", {
    t: phToken,
    cc: st.cc,
    cru: st.cru,
    cid: st.cid,
    exp: Date.now() + 5 * 60 * 1000,
  });

  return back({ code });
}

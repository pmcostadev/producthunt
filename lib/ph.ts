import { AsyncLocalStorage } from "node:async_hooks";
import { ACCESS_PREFIX, unseal } from "./seal";

const PH_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

/**
 * Per-request credential store. The token never touches disk and is never
 * shared between invocations, which is what lets a single deployment serve
 * many callers (and maps cleanly onto Composio's auth layer).
 */
export const phStore = new AsyncLocalStorage<{ token?: string }>();

/**
 * Resolve the Product Hunt token for this request. Three accepted shapes,
 * in order:
 *
 *   1. `Authorization: Bearer pht_...`  an access token this server issued
 *      through the OAuth flow, with the caller's PH token sealed inside.
 *   2. `Authorization: Bearer <raw>` or `X-ProductHunt-Token: <raw>`
 *      a Product Hunt developer token passed straight through (API-key mode).
 *   3. `PRODUCTHUNT_TOKEN` env var, as a single-user fallback.
 *
 * Both auth modes work side by side, so adding OAuth never breaks an existing
 * API-key connection.
 */
export function extractToken(req: Request): string | undefined {
  const auth = req.headers.get("authorization");
  let presented: string | undefined;

  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    presented = auth.slice(7).trim();
  } else {
    presented = req.headers.get("x-producthunt-token") ?? undefined;
  }

  if (presented?.startsWith(ACCESS_PREFIX)) {
    try {
      const payload = unseal<{ t: string }>("access", presented.slice(ACCESS_PREFIX.length));
      return payload.t;
    } catch {
      // An expired or forged token behaves as no token at all; phQuery reports it.
      return undefined;
    }
  }

  return presented ?? process.env.PRODUCTHUNT_TOKEN ?? undefined;
}

export class PhError extends Error {}

/** Execute a GraphQL document against Product Hunt API v2. */
export async function phQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const token = phStore.getStore()?.token ?? process.env.PRODUCTHUNT_TOKEN;
  if (!token) {
    throw new PhError(
      "No valid Product Hunt credential on this request. Either sign in through OAuth, or send a developer token as 'Authorization: Bearer <token>'. If you signed in a while ago, the session may have expired: reconnect. Developer tokens: https://www.producthunt.com/v2/oauth/applications"
    );
  }

  const res = await fetch(PH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });

  const remaining = res.headers.get("x-rate-limit-remaining");

  if (res.status === 401) {
    throw new PhError(
      "Product Hunt rejected the credential (401). If this is a developer token, check it is the Developer Token from the API dashboard. If you signed in with OAuth, reconnect your account."
    );
  }
  if (res.status === 429) {
    const reset = res.headers.get("x-rate-limit-reset") ?? "unknown";
    throw new PhError(
      `Rate limited by Product Hunt. Complexity budget resets in ${reset}s. The limit is 6250 points per 15 minutes.`
    );
  }
  if (!res.ok) {
    throw new PhError(
      `Product Hunt returned HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`
    );
  }

  const body = (await res.json()) as {
    data?: T;
    errors?: Array<{ message?: string; error?: string; error_description?: string }>;
  };

  if (body.errors?.length) {
    const detail = body.errors
      .map((e) => e.message ?? e.error_description ?? e.error ?? "unknown error")
      .join("; ");
    throw new PhError(`Product Hunt GraphQL error: ${detail}`);
  }
  if (!body.data) {
    throw new PhError("Product Hunt returned an empty response body.");
  }

  if (remaining && Number(remaining) < 500) {
    console.warn(`[producthunt-mcp] rate limit budget low: ${remaining} remaining`);
  }

  return body.data;
}

/** Wrap a payload in the text content block shape MCP clients expect. */
export function ok(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

export function fail(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

/** Flatten Relay-style { edges: [{ node }] } into a plain array. */
export function nodes<T>(conn: { edges?: Array<{ node: T }> } | null | undefined): T[] {
  return (conn?.edges ?? []).map((e) => e.node);
}

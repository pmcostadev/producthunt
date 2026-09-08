import { AsyncLocalStorage } from "node:async_hooks";

const PH_ENDPOINT = "https://api.producthunt.com/v2/api/graphql";

/**
 * Per-request credential store. The token never touches disk and is never
 * shared between invocations, which is what lets a single deployment serve
 * many callers (and maps cleanly onto Composio's API-key header injection).
 */
export const phStore = new AsyncLocalStorage<{ token?: string }>();

/** Pull a Product Hunt token off the incoming request, with an env fallback. */
export function extractToken(req: Request): string | undefined {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return (
    req.headers.get("x-producthunt-token") ??
    process.env.PRODUCTHUNT_TOKEN ??
    undefined
  );
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
      "No Product Hunt token. Send it as 'Authorization: Bearer <token>' or 'X-ProductHunt-Token', or set PRODUCTHUNT_TOKEN on the deployment. Get a developer token at https://www.producthunt.com/v2/oauth/applications"
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
      "Product Hunt rejected the token (401). Check that it is a valid developer token and that your scopes cover this query."
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

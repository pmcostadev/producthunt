# Product Hunt MCP

A read-only [MCP](https://modelcontextprotocol.io) server wrapping the
[Product Hunt API v2](https://api.producthunt.com/v2/docs) (GraphQL), served over
**Streamable HTTP** so it runs on Vercel with no persistent process.

Built to be registered as a **Composio custom toolkit**, but it works with any MCP
client (Claude, Cursor, OpenClaw, ChatGPT).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/pmcostadev/producthunt-mcp)

## Tools

| Tool | What it does |
|---|---|
| `ph_get_posts` | List launches. Filter by date range, topic, featured. Order by RANKING / NEWEST / VOTES / FEATURED_AT. |
| `ph_get_post` | Full detail for one launch by slug or id, including makers. |
| `ph_get_post_comments` | Read a launch's comment thread. |
| `ph_search_topics` | Search topics/categories, returns slugs for filtering. |
| `ph_get_user` | Profile, follower counts and recent launches for a maker. |
| `ph_whoami` | Verify the token works and see whose account it is. |
| `ph_graphql` | Escape hatch for arbitrary read queries. Mutations are blocked. |

## Deploy

Hit the Deploy button above, or import the repo at [vercel.com/new](https://vercel.com/new).
No environment variables are required.

Your endpoint will be `https://<your-project>.vercel.app/api/mcp`. Adding a custom
domain (e.g. `producthunt.yourdomain.com`) gives you a stable URL that doesn't leak
the Vercel project name.

## Authentication

Credentials are **passed per request and never stored on the server**:

```
Authorization: Bearer <your-product-hunt-developer-token>
```

`X-ProductHunt-Token: <token>` also works. As a fallback for single-user setups,
set `PRODUCTHUNT_TOKEN` as a Vercel environment variable and clients can skip the
header entirely.

Get a token: [producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications)
→ Add an application → copy the **Developer Token** (not the API Key / API Secret
pair above it, those are for the full OAuth flow).

## Register as a Composio custom toolkit

Dashboard form:

- **Display name**: `Product Hunt`
- **MCP server URL**: `https://<your-domain>/api/mcp`
- **Authentication**: `API Key`
- **Header**: `Authorization` with format `Bearer {{generic_api_key}}`
- **Advanced settings → Toolkit ID**: `PRODUCTHUNT`

Or via the API:

```bash
curl -X POST https://backend.composio.dev/api/v3.1/custom/toolkits/upsert \
  -H "x-api-key: $COMPOSIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "PRODUCTHUNT",
    "toolkit_config": {
      "name": "Product Hunt",
      "app_url": "https://<your-domain>/api/mcp",
      "auth_schemes": [
        {
          "mode": "API_KEY",
          "headers": { "Authorization": "Bearer {{generic_api_key}}" }
        }
      ]
    }
  }'
```

Then create the auth config with `is_enabled_for_tool_router: true`, connect an
account using your developer token as the API key, and
`POST /api/v3.1/custom/toolkits/sync` to pull the tool list in.

Note: Composio will not let you change `app_url` on an existing custom toolkit.
If you registered a placeholder URL first, delete and re-create it.

## Smoke test

```bash
curl -sN -X POST https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $PRODUCTHUNT_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

You should get seven tools back. Then try a real call:

```bash
curl -sN -X POST https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $PRODUCTHUNT_TOKEN" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ph_get_posts","arguments":{"first":5}}}'
```

## Local dev

```bash
npm install
npm run dev
# endpoint at http://localhost:3000/api/mcp
```

## Limits

- **Read-only by design.** `ph_graphql` rejects mutations. Product Hunt also
  requires manual approval for write scopes.
- **Rate limit**: 6,250 complexity points per 15 minutes. The server surfaces a
  clear error on 429 and warns in logs when the budget drops below 500.
- Runs on the Node runtime (needs `node:async_hooks` for per-request credential
  isolation), not Edge.

MIT.

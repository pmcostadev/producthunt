# Product Hunt MCP

A read-only [MCP](https://modelcontextprotocol.io) server over the
[Product Hunt API v2](https://api.producthunt.com/v2/docs) (GraphQL), with an OAuth
layer so **other people can connect their own Product Hunt account** instead of
pasting a token.

Streamable HTTP transport, so it runs on Vercel with no persistent process. Built
for use as a Composio custom toolkit, but works with any MCP client.

---

## What makes it different

Most API wrappers stop at "paste your token here." This one is also an OAuth
**authorization server**: it implements RFC 8414 metadata and RFC 7591 dynamic
client registration, brokers the Product Hunt OAuth handshake, and issues its own
encrypted, PKCE-bound tokens. An MCP client discovers it, registers itself, and
sends users through a normal consent screen.

The Product Hunt token is sealed inside the token this server issues, encrypted,
so there is nothing to store: no database, no session table, no credential at
rest. Deployment is a single stateless function.

**Writes are blocked at the boundary.** `ph_graphql` parses each query and rejects
mutations before they reach Product Hunt, which matters because the public API
exposes no upvote, comment, or submit mutations at all. A tool that pretends
otherwise just produces confident-sounding failures.

---

## Tools

18 tools, all read-only.

### Launches

| Tool | What it does |
| --- | --- |
| `ph_get_posts` | List launches. Filter by date range, topic, featured, or Twitter URL. Order by RANKING / NEWEST / VOTES / FEATURED_AT. |
| `ph_get_post` | Full detail for one launch by slug or id, including makers and media. |
| `ph_get_post_comments` | Read a launch's comments. Order by votes to surface the feedback people agreed with. |
| `ph_get_comment_thread` | Expand one comment into its full reply thread. |
| `ph_vote_velocity` | Sample individual vote timestamps and bucket them by hour, to see how fast a launch climbed. |
| `ph_get_post_collections` | Which curated collections feature a launch. |
| `ph_check_engagement` | Whether the connected account voted for, collected, or follows the topics of a launch. |

### Topics and collections

| Tool | What it does |
| --- | --- |
| `ph_search_topics` | Search topics, returns slugs for filtering. |
| `ph_get_topic` | Detail and follower count for one topic. |
| `ph_search_collections` | Find collections, ordered by followers or recency. |
| `ph_get_collection` | One collection with its launches. |

### People

| Tool | What it does |
| --- | --- |
| `ph_get_user` | Profile, follower counts, and headline for a maker. |
| `ph_get_user_posts` | Launches a user made or voted for. |
| `ph_get_user_network` | A user's followers or the accounts they follow. |
| `ph_get_user_followed_collections` | Collections a user follows. |
| `ph_check_user_follow` | Whether the connected account follows a user. |

### Account and escape hatch

| Tool | What it does |
| --- | --- |
| `ph_whoami` | Verify the credential and see whose account it is. |
| `ph_graphql` | Arbitrary read queries. Mutations are rejected. |

---

## Deploy

```bash
git clone https://github.com/pmcostadev/producthunt.git
cd producthunt
npm install
vercel
```

Endpoint: `https://<your-project>.vercel.app/api/mcp`. A custom domain gives you a
stable URL that does not leak the Vercel project name.

### OAuth mode (recommended)

Create an application at
[producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications)
and set its Redirect URI to `https://<your-domain>/api/oauth/callback`. Then set:

| Variable | Purpose |
| --- | --- |
| `PH_CLIENT_ID` | API Key from your Product Hunt application. |
| `PH_CLIENT_SECRET` | API Secret from the same application. |
| `OAUTH_SIGNING_SECRET` | 32+ random chars. Encrypts the tokens this server issues. `openssl rand -base64 32` |
| `PH_SCOPES` | Optional. Defaults to `public private`. |
| `OAUTH_PUBLIC_ORIGIN` | Optional. Pin the public origin if behind a proxy. |

### Single-user mode

Skip OAuth entirely: set `PRODUCTHUNT_TOKEN` to a developer token and clients can
call the endpoint with no credential of their own. Per-request headers also work:

```
Authorization: Bearer <developer-token>
X-ProductHunt-Token: <developer-token>
```

---

## Register as a Composio custom toolkit

- **Display name**: `Product Hunt`
- **MCP server URL**: `https://<your-domain>/api/mcp`
- **Authentication**: OAuth (Composio discovers the rest through dynamic client
  registration; there is nothing to paste)
- **Toolkit ID**: `PRODUCTHUNT`

For single-user mode instead, choose API Key with header `Authorization` and format
`Bearer {{generic_api_key}}`.

Note: Composio will not let you change `app_url` on an existing custom toolkit. If
you registered a placeholder first, delete and re-create it.

---

## Smoke test

```bash
curl -sN -X POST https://<your-domain>/api/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $PRODUCTHUNT_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Eighteen tools should come back. Then a real call:

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

---

## Limits worth knowing

These are properties of the Product Hunt API, not omissions here:

- **No write mutations exist** in the public API for voting, commenting, or
  submitting. Write scopes additionally require manual approval, and commercial use
  requires approval too.
- **Other users' profiles are redacted** without elevated access: `ph_get_user` on
  an account that is not yours can return an empty profile with `id: "0"`. The
  people tools are most useful against the connected account.
- **Goals and Spaces are gone.** They appear in the published schema but not the
  live API. Five tools were built against them and removed once live testing
  proved they could never work.
- **Rate limit**: 6,250 complexity points per 15 minutes. The server surfaces a
  clear error on 429 and warns when the remaining budget drops below 500.
- Node runtime, not Edge: per-request credential isolation uses
  `node:async_hooks`.

## License

[MIT](./LICENSE).

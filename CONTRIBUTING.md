# Contributing

Issues and pull requests are welcome. Contributions are accepted under the MIT
license, same as the rest of the project.

## Getting it running

```bash
npm install
cp .env.example .env.local
npm run dev
# endpoint at http://localhost:3000/api/mcp
```

For read-only work you only need a Product Hunt developer token in
`PRODUCTHUNT_TOKEN`. Get one at
[producthunt.com/v2/oauth/applications](https://www.producthunt.com/v2/oauth/applications).
The OAuth path additionally needs `PH_CLIENT_ID`, `PH_CLIENT_SECRET`, and
`OAUTH_SIGNING_SECRET`.

Before opening a PR:

```bash
npx tsc --noEmit
npm run build
```

CI runs both.

## Test against the live API, not the published schema

The single most important rule here. The published Product Hunt schema does not
match the live API, and trusting it has already cost this project real work:

- **Goals and Spaces appear in the schema but do not exist in the live API.** Five
  tools were built against them and deleted after live testing.
- **The live API spells one argument `followedByUserid`**, not `followedByUserId`.
  The conventional spelling is silently wrong.
- **Real data contains nulls the schema calls non-nullable.** A collection query
  broke on a null `tagline`.
- **Other users' profiles come back redacted** without elevated access: `id: "0"`
  and a placeholder username, with no error.

If you add a tool, call it against real data before opening the PR, and say in the
description what you got back.

## Keep it read-only

`ph_graphql` parses queries and rejects mutations before they reach Product Hunt.
That guard is deliberate and should stay, for two reasons: the public API exposes
no write mutations for voting, commenting, or submitting anyway, and write scopes
require manual approval from Product Hunt. A tool that appears to write would just
produce confident-sounding failures.

Please do not add write tools, and do not weaken the guard.

## Rate limits

6,250 complexity points per 15 minutes, shared across everything a token does.
Nested connections cost more, so a tool that fetches deeply can exhaust the budget
in a handful of calls. `ph_vote_velocity` is the expensive one and caps its own
sampling for that reason. Keep new tools shallow, and paginate rather than
over-fetching.

## Style

Match what is there: TypeScript, Zod schemas with `.describe()` on every field
because the descriptions are what a model reads to decide whether to call a tool,
and comments that explain *why*. If a line exists because of a specific API
quirk, name the quirk.

## Security

Do not open a public issue for anything exploitable. See [SECURITY.md](./SECURITY.md).

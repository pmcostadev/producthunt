# Security policy

## Reporting a vulnerability

Email **me@pmcosta.dev** with the details. Please do not open a public issue for
anything exploitable.

Include what you did, what happened, and what you expected. A proof of concept
helps but is not required. I will acknowledge within a few days and credit you in
the fix unless you would rather stay anonymous.

## What this server holds

Nothing at rest. There is no database and no session store:

- **The Product Hunt token is sealed inside the access token this server issues**,
  encrypted with `OAUTH_SIGNING_SECRET`. Presenting that token is what supplies
  the credential; the server stores nothing between requests.
- **Per-request credentials are held in memory only** for the life of that
  request, isolated with `node:async_hooks`.
- **`PH_CLIENT_SECRET` comes from the environment** and is never logged or
  written to disk.

So the interesting attack surface is: forging or decrypting a sealed token,
bypassing the PKCE or `redirect_uri` checks at `/api/oauth/authorize` and
`/api/oauth/token`, getting one caller's credential to leak into another request,
or slipping a mutation past the read-only guard on `ph_graphql`.

## The read-only guarantee

This server is read-only by design, and enforces it locally rather than trusting
the upstream API to refuse. `ph_graphql` parses each query and rejects anything
containing a mutation before it is sent.

A way to get a write past that guard is a legitimate vulnerability. Please report
it.

## Deploying safely

| Do | Why |
| --- | --- |
| Use a long random `OAUTH_SIGNING_SECRET` | It is the only thing protecting sealed tokens. `openssl rand -base64 32` |
| Keep `PH_CLIENT_SECRET` out of git | `.gitignore` covers `.env`; do not fight that. |
| Prefer OAuth over `PRODUCTHUNT_TOKEN` | The single-user fallback means anyone who reaches your endpoint uses your token. |
| Rotate `OAUTH_SIGNING_SECRET` if you suspect exposure | It invalidates every issued token, which is the intended effect. |

## Scope

Out of scope: vulnerabilities in the Product Hunt API or Vercel themselves (report
those upstream), rate-limit exhaustion through legitimate use, and findings that
require an attacker to already hold your environment variables.

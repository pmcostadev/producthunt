export default function Home() {
  return (
    <main>
      <h1>Product Hunt MCP</h1>
      <p>
        Streamable HTTP MCP server wrapping the Product Hunt GraphQL API v2. Read-only.
      </p>
      <p>
        MCP endpoint: <code>/api/mcp</code> &nbsp;·&nbsp; Health: <code>/api/health</code>
      </p>
      <p>
        Authenticate with <code>Authorization: Bearer &lt;product-hunt-developer-token&gt;</code>.
        Tokens are read per request and never stored.
      </p>
      <p>
        Tools: <code>ph_get_posts</code>, <code>ph_get_post</code>, <code>ph_get_post_comments</code>,{" "}
        <code>ph_search_topics</code>, <code>ph_get_user</code>, <code>ph_whoami</code>,{" "}
        <code>ph_graphql</code>.
      </p>
    </main>
  );
}

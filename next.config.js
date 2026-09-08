/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return [
      {
        source: "/.well-known/oauth-authorization-server",
        destination: "/api/oauth/metadata",
      },
      {
        source: "/.well-known/oauth-protected-resource",
        destination: "/api/oauth/resource",
      },
      // Some clients probe the resource-scoped variants.
      {
        source: "/.well-known/oauth-protected-resource/api/mcp",
        destination: "/api/oauth/resource",
      },
      {
        source: "/.well-known/oauth-authorization-server/api/mcp",
        destination: "/api/oauth/metadata",
      },
    ];
  },
};

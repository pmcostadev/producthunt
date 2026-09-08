export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    status: "ok",
    server: "producthunt-mcp",
    mcp_endpoint: "/api/mcp",
    envTokenConfigured: Boolean(process.env.PRODUCTHUNT_TOKEN),
  });
}

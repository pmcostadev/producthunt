"use client";

import { useEffect, useState } from "react";

type Tool = { name: string; tagline: string; args: number };

const TOOLS: Tool[] = [
  {
    name: "ph_get_posts",
    tagline:
      "List launches. Filter by date range, topic or featured status. Order by ranking, newest, votes or feature date.",
    args: 7,
  },
  {
    name: "ph_get_post",
    tagline: "Full detail for one launch by slug or id, including makers and description.",
    args: 2,
  },
  {
    name: "ph_get_post_comments",
    tagline: "Read a launch's comment thread. The honest read on how a product landed.",
    args: 3,
  },
  {
    name: "ph_search_topics",
    tagline: "Search topics and categories. Returns the slugs you feed back into ph_get_posts.",
    args: 3,
  },
  {
    name: "ph_get_user",
    tagline: "Profile, follower counts and recent launches for any maker.",
    args: 1,
  },
  {
    name: "ph_whoami",
    tagline: "Confirm the token works and whose account it belongs to. Start here when debugging.",
    args: 0,
  },
  {
    name: "ph_graphql",
    tagline: "Escape hatch for arbitrary read queries against the v2 schema. Mutations are blocked.",
    args: 2,
  },
];

type Health = "checking" | "up" | "down";

export default function Home() {
  const [health, setHealth] = useState<Health>("checking");
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    let cancelled = false;
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("bad status"))))
      .then(() => {
        if (!cancelled) setHealth("up");
      })
      .catch(() => {
        if (!cancelled) setHealth("down");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const endpoint = `${origin || "https://your-deployment"}/api/mcp`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked, the URL is selectable anyway */
    }
  }

  const label =
    health === "checking" ? "checking" : health === "up" ? "live" : "unreachable";

  return (
    <div className="shell">
      <header className="bar">
        <span className="wordmark">producthunt-mcp v1.0.1</span>
        <span className="pill" data-state={health === "checking" ? "wait" : health}>
          <span className="pill-dot" />
          {label}
        </span>
      </header>

      <section className="hero">
        <p className="eyebrow">Model Context Protocol server</p>
        <h1>
          Product Hunt
          <span className="dim">for agents</span>
        </h1>
        <p className="lede">
          Seven read-only tools over the Product Hunt GraphQL API v2, served over{" "}
          <strong>Streamable HTTP</strong>. Point any MCP client at the endpoint below, or register
          it as a <strong>Composio custom toolkit</strong>.
        </p>

        <div className="endpoint">
          <div className="endpoint-head">
            <span>endpoint</span>
            <span>POST · streamable http</span>
          </div>
          <div className="endpoint-body">
            <div className="endpoint-url">{endpoint}</div>
            <button className="copy" onClick={copy} data-done={copied}>
              {copied ? "copied" : "copy"}
            </button>
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2>Today&rsquo;s tools</h2>
        <span className="rule" />
        <span className="count">{TOOLS.length}</span>
      </div>

      <div className="board">
        {TOOLS.map((tool, i) => (
          <article className="row" key={tool.name}>
            <span className="rank">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <p className="name">{tool.name}</p>
              <p className="tagline">{tool.tagline}</p>
            </div>
            <div className="votes" title={`${tool.args} input parameters`}>
              <span className="caret">&#9650;</span>
              <span className="n">{tool.args}</span>
              <span className="unit">args</span>
            </div>
          </article>
        ))}
      </div>

      <div className="notes">
        <div className="note">
          <h3>Auth</h3>
          <p>
            <code>Authorization: Bearer &lt;token&gt;</code> on every request. Read per request,
            never written to disk.
          </p>
        </div>
        <div className="note">
          <h3>Token</h3>
          <p>
            Grab a developer token from the{" "}
            <a
              href="https://www.producthunt.com/v2/oauth/applications"
              target="_blank"
              rel="noreferrer"
            >
              Product Hunt API dashboard
            </a>
            . Not the key and secret pair.
          </p>
        </div>
        <div className="note">
          <h3>Limits</h3>
          <p>
            Read-only by design. 6,250 complexity points per 15 minutes, enforced upstream by
            Product Hunt.
          </p>
        </div>
        <div className="note">
          <h3>Source</h3>
          <p>
            <a href="https://github.com/pmcostadev/producthunt-mcp" target="_blank" rel="noreferrer">
              github.com/pmcostadev/producthunt-mcp
            </a>
          </p>
        </div>
      </div>

      <p className="sig">Built by pmcosta.dev · MIT</p>
    </div>
  );
}

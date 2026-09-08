"use client";

import { useState } from "react";
import "./verify.css";

type Status = "idle" | "running" | "pass" | "fail";

/** Parse a JSON-RPC result out of either a plain JSON or an SSE body. */
function parseRpc(raw: string): any {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through to SSE parsing */
    }
  }
  for (const line of trimmed.split("\n")) {
    const s = line.trim();
    if (s.startsWith("data:")) {
      try {
        return JSON.parse(s.slice(5).trim());
      } catch {
        /* keep scanning */
      }
    }
  }
  throw new Error("Could not read the server's reply.");
}

async function rpc(body: unknown, token: string) {
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  return parseRpc(await res.text());
}

export default function Verify() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [sample, setSample] = useState<string[]>([]);

  async function run() {
    setStatus("running");
    setMessage("");
    setSample([]);

    try {
      // Handshake first so the server is happy in either protocol era.
      await rpc(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "producthunt-mcp-verify", version: "1.0.0" },
          },
        },
        token
      ).catch(() => null);

      const listed = await rpc(
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
        token
      );
      const count = listed?.result?.tools?.length ?? 0;
      if (!count) throw new Error("The server did not list any tools.");

      const called = await rpc(
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "ph_get_posts", arguments: { first: 3 } },
        },
        token
      );

      const text: string = called?.result?.content?.[0]?.text ?? "";
      if (called?.result?.isError) throw new Error(text || "Product Hunt rejected the call.");

      let names: string[] = [];
      try {
        names = (JSON.parse(text).posts ?? []).map(
          (p: any) => `${p.name} — ${p.tagline}`
        );
      } catch {
        throw new Error(text || "Unexpected response from Product Hunt.");
      }

      setStatus("pass");
      setMessage(`${count} tools live. Token accepted by Product Hunt.`);
      setSample(names);
    } catch (e) {
      setStatus("fail");
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="verify">
      <div className="verify-head">
        <span>verify</span>
        <span>read-only · token not stored</span>
      </div>
      <div className="verify-body">
        <p className="verify-help">
          Paste your Product Hunt developer token to run a live check: lists the tools, then pulls
          three real launches.
        </p>
        <div className="verify-row">
          <input
            className="verify-input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Product Hunt developer token"
            spellCheck={false}
            autoComplete="off"
            aria-label="Product Hunt developer token"
          />
          <button
            className="verify-run"
            onClick={run}
            disabled={!token || status === "running"}
          >
            {status === "running" ? "testing" : "run test"}
          </button>
        </div>

        {status !== "idle" && status !== "running" && (
          <div className="verify-out" data-state={status}>
            <p className="verify-msg">
              {status === "pass" ? "Everything works." : "Something's off."} {message}
            </p>
            {sample.length > 0 && (
              <ul className="verify-list">
                {sample.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

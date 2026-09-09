'use client';

import { useEffect, useState } from 'react';

type Health = 'checking' | 'up' | 'down';

/**
 * The endpoint, with a copy button and a real health check.
 *
 * The origin is read in the browser rather than hardcoded so a fork or a preview
 * deployment shows its own URL, which is the one the reader needs to paste.
 */
export default function Endpoint() {
  const [health, setHealth] = useState<Health>('checking');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);

    let cancelled = false;
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then(() => {
        if (!cancelled) setHealth('up');
      })
      .catch(() => {
        if (!cancelled) setHealth('down');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const endpoint = `${origin || 'https://producthunt.pmcosta.dev'}/api/mcp`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(endpoint);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked. The URL is selectable, so nothing is lost.
    }
  }

  // Status is always a square dot plus a word, never a dot on its own.
  const word = health === 'checking' ? 'Checking' : health === 'up' ? 'Live' : 'Unreachable';

  return (
    <div className="endpoint">
      <div className="endpoint-head label-sm">
        <span>Endpoint &middot; streamable http</span>
        <span className="status" data-state={health}>
          <span className="status-dot" />
          {word}
        </span>
      </div>
      <div className="endpoint-body">
        <span className="endpoint-url">{endpoint}</span>
        <button className="btn btn-secondary" onClick={copy} type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

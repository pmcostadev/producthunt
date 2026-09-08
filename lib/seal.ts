import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Stateless token plumbing.
 *
 * Every piece of OAuth state this server needs to remember (registered clients,
 * authorization codes, issued access tokens) is encrypted into the value we hand
 * out, so nothing has to be stored server-side. No database, no Redis, works on
 * serverless. Each blob carries a `p` (purpose) tag so a value minted for one
 * step can never be replayed at another.
 */

const ALGO = "aes-256-gcm";

function key(): Buffer {
  const secret = process.env.OAUTH_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "OAUTH_SIGNING_SECRET is missing or too short. Set it to a random string of at least 32 characters in your Vercel environment variables."
    );
  }
  return createHash("sha256").update(secret).digest();
}

export type Purpose = "client" | "code" | "access" | "refresh" | "state";

export function seal(purpose: Purpose, payload: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify({ ...payload, p: purpose }), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function unseal<T = Record<string, any>>(purpose: Purpose, token: string): T {
  let raw: Buffer;
  try {
    raw = Buffer.from(token, "base64url");
  } catch {
    throw new Error("malformed token");
  }
  if (raw.length < 29) throw new Error("malformed token");

  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const body = raw.subarray(28);

  let json: string;
  try {
    const decipher = createDecipheriv(ALGO, key(), iv);
    decipher.setAuthTag(tag);
    json = Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("token failed authentication");
  }

  const parsed = JSON.parse(json);
  if (parsed.p !== purpose) throw new Error("token used for the wrong purpose");
  if (typeof parsed.exp === "number" && Date.now() > parsed.exp) {
    throw new Error("token expired");
  }
  return parsed as T;
}

/** Verify an RFC 7636 S256 challenge. Product Hunt rejects `plain`, so do we. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  const computed = createHash("sha256").update(verifier, "ascii").digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The public origin of this deployment, taken from the incoming request. */
export function originOf(req: Request): string {
  const explicit = process.env.OAUTH_PUBLIC_ORIGIN;
  if (explicit) return explicit.replace(/\/$/, "");
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Prefix so we can tell our own access tokens from a raw Product Hunt token. */
export const ACCESS_PREFIX = "pht_";

// HMAC-signed admin session cookie. Works on both Edge (middleware) and
// Node (route handlers) via Web Crypto — no `node:crypto` dependency.
//
// Cookie value format:  <issuedAt>.<ttlSec>.<base64url(HMAC-SHA256)>
//
// If ADMIN_COOKIE_SECRET is unset, signing/verification silently fall back
// to the legacy literal "true" for dev environments — but production MUST
// set the secret or the API endpoints can be trivially forged.

const SECRET = process.env.ADMIN_COOKIE_SECRET;
const LEGACY_VALUE = "true";
const IS_PROD = process.env.NODE_ENV === "production";

// In production we require a real HMAC secret — no silent fallback. The
// legacy `"true"` shortcut is only for local dev so the app works when the
// developer hasn't set up the secret yet.
if (IS_PROD && !SECRET) {
  // Log loudly once at module load. We don't throw at import time because
  // Next.js may statically analyze this file during build and we'd bring
  // the whole app down — but verify/sign below will refuse to operate.
  // eslint-disable-next-line no-console
  console.error(
    "ADMIN_COOKIE_SECRET is not set in production — admin auth is disabled."
  );
}

function textEncoder() {
  return new TextEncoder();
}

async function hmacKey(): Promise<CryptoKey | null> {
  if (!SECRET) return null;
  return crypto.subtle.importKey(
    "raw",
    textEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? 0 : 4 - (b64.length % 4);
  const bin = atob(b64 + "=".repeat(pad));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * Produce a signed cookie value with an absolute expiry baked in.
 * ttlSec is both advertised to the server check and used for cookie maxAge.
 */
export async function signAdminCookie(ttlSec: number): Promise<string> {
  const key = await hmacKey();
  if (!key) {
    if (IS_PROD) {
      throw new Error(
        "ADMIN_COOKIE_SECRET not set — refusing to issue unsigned admin cookie in production."
      );
    }
    return LEGACY_VALUE;
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${issuedAt}.${ttlSec}`;
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder().encode(payload)
  );
  return `${payload}.${toBase64Url(sig)}`;
}

/**
 * Accept the value from the cookie and return true iff:
 * - It was signed with the configured secret, AND
 * - The absolute expiry hasn't passed.
 *
 * Fallback: if ADMIN_COOKIE_SECRET is unset (e.g. local dev), accept the
 * legacy literal "true" so existing setups keep working.
 */
export async function verifyAdminCookie(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;

  const key = await hmacKey();
  if (!key) {
    // Never accept the legacy literal in production.
    if (IS_PROD) return false;
    return value === LEGACY_VALUE;
  }

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [issuedStr, ttlStr, sigB64] = parts;
  const issuedAt = Number(issuedStr);
  const ttl = Number(ttlStr);
  if (!Number.isFinite(issuedAt) || !Number.isFinite(ttl)) return false;
  if (issuedAt <= 0 || ttl <= 0) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > issuedAt + ttl) return false;

  const payload = `${issuedAt}.${ttl}`;
  const expected = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder().encode(payload)
  );
  const expectedBytes = new Uint8Array(expected);
  let actualBytes: Uint8Array;
  try {
    actualBytes = fromBase64Url(sigB64);
  } catch {
    return false;
  }
  return timingSafeEqual(expectedBytes, actualBytes);
}

export const ADMIN_COOKIE_NAME = "admin-session";
export const ADMIN_COOKIE_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

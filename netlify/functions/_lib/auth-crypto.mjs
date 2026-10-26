import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password), salt, 32, SCRYPT_OPTS).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, stored) {
  const parts = String(stored || "").split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = parts[1];
  const expected = Buffer.from(parts[2], "hex");
  const actual = scryptSync(String(password), salt, 32, SCRYPT_OPTS);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

const STATELESS_PREFIX = "stv1.";

function sessionSigningSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.AUTH_BOOTSTRAP_PASSWORD ||
    process.env.AUTH_PASSWORD ||
    ""
  );
}

/** Signed cookie token when no Supabase / local user file (Netlify production). */
export function createStatelessSessionToken(username, userId = "env-bootstrap") {
  const secret = sessionSigningSecret();
  if (!secret || !username) return "";
  const exp = Date.now() + 14 * 86400000;
  const payload = `${userId}|${username}|${exp}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${STATELESS_PREFIX}${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

/** @returns {{ user_id: string, username: string, token: string, expires_at: string } | null} */
export function verifyStatelessSessionToken(token) {
  const secret = sessionSigningSecret();
  if (!secret || !String(token || "").startsWith(STATELESS_PREFIX)) return null;
  const rest = String(token).slice(STATELESS_PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot < 0) return null;
  const payloadB64 = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  let payload;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  if (expected.length !== sig.length || !/^[a-f0-9]+$/i.test(sig)) return null;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(sig, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [user_id, username, expStr] = payload.split("|");
  const exp = Number(expStr);
  if (!user_id || !username || !Number.isFinite(exp) || exp < Date.now()) return null;
  return {
    user_id,
    username,
    token,
    expires_at: new Date(exp).toISOString(),
  };
}

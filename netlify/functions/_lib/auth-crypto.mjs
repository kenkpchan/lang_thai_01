import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

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

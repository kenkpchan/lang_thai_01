import { getSession } from "./auth-db.mjs";

function parseCookies(event) {
  const raw =
    event?.headers?.cookie ||
    event?.headers?.Cookie ||
    "";
  const out = {};
  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i < 0) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

function bearerToken(event) {
  const h =
    event?.headers?.authorization ||
    event?.headers?.Authorization ||
    "";
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

/** @param {import("./cors.mjs").LambdaEvent} event */
export async function getAuthUser(event) {
  const cookies = parseCookies(event);
  const token = bearerToken(event) || cookies.tv_session || "";
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return { username: session.username, user_id: session.user_id, token: session.token };
}

/** @param {import("./cors.mjs").LambdaEvent} event */
export async function requireAuth(event) {
  const user = await getAuthUser(event);
  if (user) return user;
  const err = new Error("Login required.");
  err.code = "UNAUTHORIZED";
  throw err;
}

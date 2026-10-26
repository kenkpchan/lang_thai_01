import {
  preflight,
  json,
  parseBody,
  sessionCookieHeader,
  clearSessionCookieHeader,
} from "./_lib/cors.mjs";
import { verifyLogin, createSession, getSession, deleteSession } from "./_lib/auth-db.mjs";
import { getAuthUser } from "./_lib/require-auth.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return preflight(event);

  const params = event.queryStringParameters || {};

  try {
    if (event.httpMethod === "GET") {
      const user = await getAuthUser(event);
      if (!user) {
        return json(401, { ok: false, error: "Not logged in." }, event);
      }
      return json(200, { ok: true, username: user.username }, event);
    }

    if (event.httpMethod === "POST" && params.action === "logout") {
      const user = await getAuthUser(event);
      if (user?.token) await deleteSession(user.token);
      return json(
        200,
        { ok: true },
        event,
        { "Set-Cookie": clearSessionCookieHeader() }
      );
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (body === null) return json(400, { error: "Invalid JSON" }, event);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!username || !password) {
        return json(400, { error: "Enter username and password." }, event);
      }
      const user = await verifyLogin(username, password);
      if (!user) {
        return json(401, { error: "Wrong username or password." }, event);
      }
      const session = await createSession(user.id);
      return json(
        200,
        {
          ok: true,
          username: user.username,
          token: session.token,
        },
        event,
        { "Set-Cookie": sessionCookieHeader(session.token) }
      );
    }

    return json(405, { error: "Method not allowed" }, event);
  } catch (e) {
    return json(500, { error: e.message || "Auth error" }, event);
  }
}

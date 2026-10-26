import { preflight, json, parseBody } from "./_lib/cors.mjs";
import { requireAuth } from "./_lib/require-auth.mjs";
import {
  buildTodayQueue,
  applyRecallRating,
  dbMode,
} from "./_lib/db.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return preflight(event);
  const r = (status, body) => json(status, body, event);
  try {
    await requireAuth(event);
  } catch (e) {
    if (e.code === "UNAUTHORIZED") {
      return r(401, { error: e.message, code: "UNAUTHORIZED" });
    }
    throw e;
  }

  try {
    if (event.httpMethod === "GET") {
      const queue = await buildTodayQueue();
      return r(200, { ...queue, db: dbMode() });
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (body === null) return r(400, { error: "Invalid JSON body" });
      const cardId = String(body.card_id || "").trim();
      const rating = String(body.rating || "").trim().toLowerCase();
      if (!cardId) return r(400, { error: "Missing card_id" });
      const state = await applyRecallRating(cardId, rating);
      return r(200, { state, db: dbMode() });
    }

    return r(405, { error: "Method not allowed" });
  } catch (e) {
    const code = e.code || "SERVER";
    const status =
      code === "NOT_FOUND" ? 404 :
      code === "VALIDATION" ? 400 :
      500;
    return r(status, { error: e.message || "Request failed", code });
  }
}

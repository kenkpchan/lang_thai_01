import { preflight, json, parseBody } from "./_lib/cors.mjs";
import { requireAuth } from "./_lib/require-auth.mjs";
import {
  listCards,
  updateHistory,
  deleteHistory,
  getCardById,
  resolveLinks,
  batchUpdateCards,
  dbMode,
} from "./_lib/db.mjs";
import { translateEnglish } from "./_lib/ai.mjs";

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

  const method = event.httpMethod;
  const params = event.queryStringParameters || {};

  try {
    if (method === "GET") {
      const id = String(params.id || "").trim();
      if (id) {
        const card = await getCardById(id);
        if (!card) return r(404, { error: "Not found" });
        const related = await resolveLinks(id);
        return r(200, { item: card, ...related, db: dbMode() });
      }
      const rows = await listCards({
        q: params.q,
        limit: params.limit,
        status: params.status,
        include_archived: params.include_archived,
      });
      return r(200, { items: rows, db: dbMode() });
    }

    if (method === "PATCH") {
      const body = parseBody(event);
      if (body === null) return r(400, { error: "Invalid JSON body" });

      if (body.batch === true && Array.isArray(body.ids) && body.ids.length) {
        const patch = {};
        if (body.revision_status !== undefined) {
          patch.revision_status = String(body.revision_status);
        }
        if (body.notes !== undefined) patch.notes = String(body.notes);
        const items = await batchUpdateCards(
          body.ids.map((x) => String(x).trim()).filter(Boolean),
          patch
        );
        return r(200, { items, db: dbMode() });
      }

      const id = String(body.id || params.id || "").trim();
      if (!id) return r(400, { error: "Missing id" });

      if (body.retranslate) {
        const row = await getCardById(id);
        if (!row) return r(404, { error: "Not found" });
        const english = String(body.english || row.english_input || "").trim();
        if (!english) return r(400, { error: "Missing English text to re-translate" });
        const translation = await translateEnglish(english);
        const updated = await updateHistory(id, {
          english_input: english,
          translation,
          notes: body.notes !== undefined ? String(body.notes) : row.notes,
          revision_status: body.revision_status || row.revision_status,
        });
        return r(200, { item: updated, translation, db: dbMode() });
      }

      const updated = await updateHistory(id, {
        notes: body.notes !== undefined ? String(body.notes) : undefined,
        revision_status: body.revision_status,
      });
      return r(200, { item: updated, db: dbMode() });
    }

    if (method === "DELETE") {
      const body = parseBody(event) || {};
      const id = String(body.id || params.id || "").trim();
      if (!id) return r(400, { error: "Missing id" });
      await deleteHistory(id);
      return r(200, { ok: true, db: dbMode() });
    }

    return r(405, { error: "Method not allowed" });
  } catch (e) {
    const code = e.code || "SERVER";
    const status =
      code === "NOT_FOUND" ? 404 :
      code === "VALIDATION" ? 400 :
      code === "CONFIG" ? 503 :
      code === "AI" ? 502 :
      code === "NETWORK" ? 502 :
      500;
    return r(status, { error: e.message || "Request failed", code });
  }
}

import { preflight, json, parseBody } from "./_lib/cors.mjs";
import { requireAuth } from "./_lib/require-auth.mjs";
import { runChallengeGeneration, normalizeWebMode } from "./_lib/challenge-run.mjs";
import {
  dbMode,
  listChallengeTopics,
  getChallengeTopicById,
  updateChallengeTopic,
  deleteChallengeTopic,
  saveChallengeFromGeneration,
} from "./_lib/db.mjs";

function rowToClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    prompt: row.prompt,
    topic_en: row.topic_en,
    note_en: row.note_en,
    web_mode_requested: row.web_mode_requested,
    web_decision: row.web_decision,
    web_decision_reason: row.web_decision_reason,
    web_used: !!row.web_used,
    web_search_error: row.web_search_error || "",
    web_search_attempted: row.web_decision === "live",
    source_links: row.source_links || [],
    sentences: row.sentences || [],
    notes: row.notes || "",
    revision_status: row.revision_status || "current",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function rowToListItem(row) {
  return {
    id: row.id,
    prompt: row.prompt,
    topic_en: row.topic_en,
    revision_status: row.revision_status || "current",
    web_decision: row.web_decision,
    updated_at: row.updated_at,
  };
}

function mapValidationError(e, r) {
  if (e.code === "VALIDATION") return r(400, { error: e.message, code: "VALIDATION" });
  if (e.code === "NOT_FOUND") return r(404, { error: e.message, code: "NOT_FOUND" });
  return null;
}

function mapGenerationError(e, r) {
  const code = e.code || "SERVER";
  const status =
    code === "CONFIG" ? 503 :
    code === "AI" ? 502 :
    code === "NETWORK" ? 502 :
    code === "TAVILY" ? 502 :
    code === "VALIDATION" ? 400 :
    500;
  return r(status, { error: e.message || "Challenge failed", code });
}

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

  const qs = event.queryStringParameters || {};

  if (event.httpMethod === "GET") {
    try {
      const id = (qs.id || "").trim();
      if (id) {
        const row = await getChallengeTopicById(id);
        if (!row) return r(404, { error: "Not found", code: "NOT_FOUND" });
        return r(200, { item: rowToClient(row), db: dbMode() });
      }
      const items = await listChallengeTopics({
        q: qs.q,
        limit: qs.limit,
        status: qs.status,
        include_archived: qs.include_archived,
      });
      return r(200, {
        items: items.map(rowToListItem),
        db: dbMode(),
      });
    } catch (e) {
      return r(500, { error: e.message || "List failed", code: e.code || "DB" });
    }
  }

  if (event.httpMethod === "PATCH") {
    const body = parseBody(event);
    if (body === null) return r(400, { error: "Invalid JSON body" });
    const id = String(body.id || "").trim();
    if (!id) return r(400, { error: "Missing id" });
    try {
      const updated = await updateChallengeTopic(id, {
        notes: body.notes,
        revision_status: body.revision_status,
      });
      return r(200, { item: rowToClient(updated), db: dbMode() });
    } catch (e) {
      const mapped = mapValidationError(e, r);
      if (mapped) return mapped;
      return r(500, { error: e.message || "Update failed", code: e.code || "DB" });
    }
  }

  if (event.httpMethod === "DELETE") {
    const id = (qs.id || "").trim();
    if (!id) return r(400, { error: "Missing id query parameter" });
    try {
      await deleteChallengeTopic(id);
      return r(200, { ok: true, db: dbMode() });
    } catch (e) {
      const mapped = mapValidationError(e, r);
      if (mapped) return mapped;
      return r(500, { error: e.message || "Delete failed", code: e.code || "DB" });
    }
  }

  if (event.httpMethod !== "POST") {
    return r(405, { error: "Method not allowed" });
  }

  const body = parseBody(event);
  if (body === null) return r(400, { error: "Invalid JSON body" });

  const save = body.save !== false;
  const regenerateId = String(body.regenerate_id || body.regenerateId || "").trim();

  try {
    if (regenerateId) {
      const existing = await getChallengeTopicById(regenerateId);
      if (!existing) {
        return r(404, { error: "Topic not found", code: "NOT_FOUND" });
      }
      const prompt = String(body.prompt || existing.prompt || "").trim();
      const webModeRequested =
        body.web_mode !== undefined
          ? normalizeWebMode(body.web_mode)
          : existing.web_mode_requested || "auto";

      const generated = await runChallengeGeneration(prompt, webModeRequested, {
        use_web: body.use_web,
      });

      if (!save) {
        return r(200, { ...generated, regenerate_id: regenerateId, db: dbMode() });
      }

      const updated = await updateChallengeTopic(regenerateId, {
        content: generated,
      });
      const item = rowToClient(updated);
      return r(200, { ...item, saved: true, regenerated: true, db: dbMode() });
    }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      return r(400, { error: "Describe a topic or challenge in English." });
    }

    const webModeRequested = normalizeWebMode(body.web_mode);
    const generated = await runChallengeGeneration(prompt, webModeRequested, {
      use_web: body.use_web,
    });

    if (!save) {
      return r(200, { ...generated, db: dbMode() });
    }

    const saved = await saveChallengeFromGeneration(generated);
    if (!saved || !saved.id) {
      return r(500, {
        error: "Challenge generated but could not save to topic library.",
        code: "DB",
      });
    }
    const item = rowToClient(saved);
    return r(200, { ...item, saved: true, db: dbMode() });
  } catch (e) {
    const mapped = mapValidationError(e, r);
    if (mapped) return mapped;
    return mapGenerationError(e, r);
  }
}

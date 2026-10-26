import { preflight, json, parseBody } from "./_lib/cors.mjs";
import { requireAuth } from "./_lib/require-auth.mjs";
import {
  getCardById,
  resolveLinks,
  addCardLink,
  removeCardLink,
  findActiveCardsByKey,
  saveCard,
  dbMode,
  normalizeEnglishKey,
} from "./_lib/db.mjs";
import { suggestLinkCandidates, translateWithMeta } from "./_lib/ai.mjs";
import { LINK_RELATIONS } from "./_lib/schema.mjs";

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

  const params = event.queryStringParameters || {};

  try {
    if (event.httpMethod === "GET") {
      const cardId = String(params.card_id || "").trim();
      if (!cardId) return r(400, { error: "Missing card_id" });
      const resolved = await resolveLinks(cardId);
      return r(200, { ...resolved, db: dbMode() });
    }

    if (event.httpMethod === "POST") {
      const body = parseBody(event);
      if (body === null) return r(400, { error: "Invalid JSON body" });

      if (body.action === "suggest") {
        const cardId = String(body.card_id || "").trim();
        const card = await getCardById(cardId);
        if (!card) return r(404, { error: "Card not found" });
        if (!["reviewed", "current"].includes(card.revision_status)) {
          return r(400, {
            error: "Mark card as reviewed before AI link suggestions.",
          });
        }
        const candidates = await suggestLinkCandidates(card);
        const suggestions = [];
        for (const c of candidates) {
          if (!c.english) continue;
          const key = normalizeEnglishKey(c.english);
          const target = (await findActiveCardsByKey(key))[0];
          if (target && target.id === cardId) continue;
          suggestions.push({
            english: c.english,
            relation: LINK_RELATIONS.includes(c.relation)
              ? c.relation
              : "same_topic",
            reason: c.reason,
            card_id: target ? target.id : null,
            thai_word: target ? target.thai_word : null,
            pending: !target,
          });
        }
        return r(200, { suggestions, db: dbMode() });
      }

      if (body.action === "accept") {
        const fromId = String(body.from_id || "").trim();
        const english = String(body.english || "").trim();
        const relation = String(body.relation || "same_topic").trim();
        let toId = String(body.to_id || "").trim();
        if (!fromId || !english) {
          return r(400, { error: "Missing from_id or english" });
        }
        if (!toId) {
          const existing = (await findActiveCardsByKey(normalizeEnglishKey(english)))[0];
          if (existing) {
            toId = existing.id;
          } else {
            const meta = await translateWithMeta(english);
            const saved = await saveCard(english, meta.translation, {
              revision_status: "current",
              notes: `Accepted link from card ${fromId}`,
            });
            toId = saved.id;
          }
        }
        if (toId === fromId) {
          return r(400, { error: "Cannot link card to itself" });
        }
        const link = await addCardLink({
          from_id: fromId,
          to_id: toId,
          relation,
        });
        const target = await getCardById(toId);
        return r(200, {
          link,
          card_id: toId,
          thai_word: target?.thai_word,
          db: dbMode(),
        });
      }

      const fromId = String(body.from_id || "").trim();
      const toId = String(body.to_id || "").trim();
      const relation = String(body.relation || "same_topic").trim();
      const link = await addCardLink({ from_id: fromId, to_id: toId, relation });
      return r(200, { link, db: dbMode() });
    }

    if (event.httpMethod === "DELETE") {
      const body = parseBody(event) || {};
      const linkId = String(body.link_id || params.link_id || "").trim();
      if (!linkId) return r(400, { error: "Missing link_id" });
      await removeCardLink(linkId);
      return r(200, { ok: true, db: dbMode() });
    }

    return r(405, { error: "Method not allowed" });
  } catch (e) {
    const code = e.code || "SERVER";
    const status =
      code === "NOT_FOUND" ? 404 :
      code === "VALIDATION" ? 400 :
      code === "AI" ? 502 :
      code === "NETWORK" ? 502 :
      500;
    return r(status, { error: e.message || "Request failed", code });
  }
}

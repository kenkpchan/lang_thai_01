import { preflight, json, parseBody } from "./_lib/cors.mjs";
import { requireAuth } from "./_lib/require-auth.mjs";
import { translateWithMeta } from "./_lib/ai.mjs";
import {
  saveCard,
  findActiveCardsByKey,
  appendLookupLog,
  dbMode,
  normalizeEnglishKey,
} from "./_lib/db.mjs";

const MAX_LEN = 240;

function cardToTranslation(row) {
  return {
    thai_word: row.thai_word,
    roman_syllables: row.roman_syllables,
    roman_compact: row.roman_compact,
    chinese_traditional: row.chinese_traditional,
    meaning_en: row.meaning_en,
    example_thai: row.example_thai,
    example_roman: row.example_roman,
    example_chinese: row.example_chinese,
  };
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
  if (event.httpMethod !== "POST") {
    return r(405, { error: "Method not allowed" });
  }

  const body = parseBody(event);
  if (body === null) return r(400, { error: "Invalid JSON body" });

  const raw = String(body.english || "").trim();
  if (!raw) return r(400, { error: "Enter an English word or short phrase." });
  if (raw.length > MAX_LEN) {
    return r(400, { error: `Keep input under ${MAX_LEN} characters.` });
  }

  const save = body.save !== false;
  const forceAi = body.force_ai === true;
  const confirmEnglish = String(body.confirm_english || "").trim();
  const spellingConfirmed = body.spelling_confirmed === true;
  const saveNewSense = body.save_new_sense === true;
  const cardId = String(body.card_id || "").trim();
  const key = normalizeEnglishKey(raw);

  try {
    if (!forceAi && !confirmEnglish && !saveNewSense && !cardId) {
      const existing = await findActiveCardsByKey(key);
      if (existing.length === 1) {
        const card = existing[0];
        await appendLookupLog({
          english_raw: raw,
          english_key: key,
          card_id: card.id,
          action: "cache_hit",
        });
        return r(200, {
          cache_hit: true,
          english_input: card.english_input,
          original_input: card.original_input || raw,
          translation: cardToTranslation(card),
          history: card,
          db: dbMode(),
        });
      }
      if (existing.length > 1) {
        return r(200, {
          multiple_senses: true,
          english_raw: raw,
          english_key: key,
          senses: existing,
          db: dbMode(),
        });
      }
    }

    const textForAi = confirmEnglish || raw;
    const meta = await translateWithMeta(textForAi);
    const canonical = (confirmEnglish || meta.suggested_english || raw).trim();
    const canonicalKey = normalizeEnglishKey(canonical);
    const suggestedKey = normalizeEnglishKey(meta.suggested_english || canonical);

    if (!forceAi && !spellingConfirmed && !saveNewSense && !cardId) {
      if (
        meta.confidence === "high" &&
        meta.suggested_english &&
        suggestedKey !== key
      ) {
        const suggestedCards = await findActiveCardsByKey(suggestedKey);
        if (suggestedCards.length >= 1) {
          const card = suggestedCards[0];
          await appendLookupLog({
            english_raw: raw,
            english_key: suggestedKey,
            card_id: card.id,
            action: "spelling_redirect",
            detail: meta.suggested_english,
          });
          return r(200, {
            spelling_redirect: true,
            suggested_english: meta.suggested_english,
            english_raw: raw,
            cache_hit: true,
            english_input: card.english_input,
            translation: cardToTranslation(card),
            history: card,
            db: dbMode(),
          });
        }
        return r(200, {
          needs_confirm_spelling: true,
          suggested_english: meta.suggested_english,
          english_raw: raw,
          preview: meta.translation,
          db: dbMode(),
        });
      }

      if (!meta.input_ok || meta.confidence === "low") {
        return r(200, {
          needs_confirm_spelling: true,
          ambiguous: true,
          suggested_english: meta.suggested_english || "",
          english_raw: raw,
          preview: meta.translation,
          db: dbMode(),
        });
      }

      if (meta.confidence === "medium" && suggestedKey !== key && meta.suggested_english) {
        return r(200, {
          needs_confirm_spelling: true,
          suggested_english: meta.suggested_english,
          english_raw: raw,
          preview: meta.translation,
          db: dbMode(),
        });
      }
    }

    if (!saveNewSense && !cardId) {
      const sameKeyCards = await findActiveCardsByKey(canonicalKey);
      const different = sameKeyCards.filter(
        (c) => c.thai_word !== meta.translation.thai_word
      );
      if (different.length > 0) {
        return r(200, {
          needs_new_sense: true,
          english_input: canonical,
          english_raw: raw,
          existing: different,
          proposed: meta.translation,
          db: dbMode(),
        });
      }
    }

    let history = null;
    if (save) {
      const noteExtra =
        raw !== canonical && !confirmEnglish
          ? `Typed: ${raw}`
          : "";
      history = await saveCard(canonical, meta.translation, {
        notes: noteExtra,
        revision_status: "current",
        original_input: raw,
        card_id: cardId || undefined,
      });
      await appendLookupLog({
        english_raw: raw,
        english_key: canonicalKey,
        card_id: history.id,
        action: forceAi ? "refresh" : "translate",
      });
    }

    return r(200, {
      english_input: canonical,
      original_input: raw,
      translation: meta.translation,
      history,
      meta: {
        input_ok: meta.input_ok,
        suggested_english: meta.suggested_english,
        confidence: meta.confidence,
      },
      db: dbMode(),
    });
  } catch (e) {
    const code = e.code || "SERVER";
    const status =
      code === "CONFIG" ? 503 :
      code === "NETWORK" ? 502 :
      code === "AI" ? 502 :
      code === "DB" ? 500 :
      500;
    return r(status, { error: e.message || "Translation failed", code });
  }
}

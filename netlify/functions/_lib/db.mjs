import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { dataDir } from "./data-path.mjs";
import {
  REVISION_STATUSES,
  ACTIVE_CARD_STATUSES,
  LINK_RELATIONS,
  normalizeEnglishKey,
} from "./schema.mjs";

const root = dataDir();
const LOCAL_FILE =
  process.env.TRANSLATION_HISTORY_FILE ||
  path.join(root, "translation-history.json");
const LOG_FILE =
  process.env.TRANSLATION_LOOKUP_LOG_FILE ||
  path.join(root, "translation-lookup-log.json");
const LINKS_FILE =
  process.env.TRANSLATION_LINKS_FILE ||
  path.join(root, "card-links.json");
const REVIEW_STATE_FILE =
  process.env.REVIEW_STATE_FILE || path.join(root, "review-state.json");
const CHALLENGE_TOPICS_FILE =
  process.env.CHALLENGE_TOPICS_FILE ||
  path.join(root, "challenge-topics.json");

function useSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders(prefer) {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: prefer || "return=representation",
  };
}

function rowFromTranslation(english_input, english_key, translation, meta = {}) {
  return {
    english_input,
    english_key,
    original_input: meta.original_input || english_input,
    thai_word: translation.thai_word,
    roman_syllables: translation.roman_syllables,
    roman_compact: translation.roman_compact,
    chinese_traditional: translation.chinese_traditional,
    meaning_en: translation.meaning_en,
    example_thai: translation.example_thai,
    example_roman: translation.example_roman,
    example_chinese: translation.example_chinese,
    raw_json: translation,
    notes: meta.notes || "",
    revision_status: meta.revision_status || "current",
  };
}

function migrateCard(row) {
  const english_input = row.english_input || "";
  const english_key = row.english_key || normalizeEnglishKey(english_input);
  return { ...row, english_key, original_input: row.original_input || english_input };
}

function dedupeCards(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = `${r.english_key}|${r.thai_word}`;
    const prev = map.get(k);
    if (!prev || String(r.updated_at || "").localeCompare(String(prev.updated_at || "")) > 0) {
      map.set(k, r);
    }
  }
  return [...map.values()].sort((a, b) =>
    String(b.updated_at || "").localeCompare(String(a.updated_at || ""))
  );
}

function readLocalCards() {
  try {
    const raw = fs.readFileSync(LOCAL_FILE, "utf8");
    const data = JSON.parse(raw);
    const rows = Array.isArray(data) ? data : [];
    const migrated = rows.map(migrateCard);
    const deduped = dedupeCards(migrated);
    if (deduped.length !== migrated.length) writeLocalCards(deduped);
    return deduped;
  } catch (e) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

function writeLocalCards(rows) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function readLocalLog() {
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

function writeLocalLog(rows) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  const trimmed = rows.slice(0, 500);
  fs.writeFileSync(LOG_FILE, JSON.stringify(trimmed, null, 2), "utf8");
}

function readLocalLinks() {
  try {
    const raw = fs.readFileSync(LINKS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

function writeLocalLinks(rows) {
  fs.mkdirSync(path.dirname(LINKS_FILE), { recursive: true });
  fs.writeFileSync(LINKS_FILE, JSON.stringify(rows, null, 2), "utf8");
}

export function dbMode() {
  return useSupabase() ? "supabase" : "local-file";
}

/**
 * @param {{ english_raw: string, english_key: string, card_id?: string, action: string, detail?: string }} entry
 */
export async function appendLookupLog(entry) {
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/lookup_log`;
    await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        english_raw: entry.english_raw,
        english_key: entry.english_key,
        card_id: entry.card_id || null,
        action: entry.action,
        detail: entry.detail || "",
      }),
    }).catch(() => {});
    return;
  }
  const log = readLocalLog();
  log.unshift({
    id: randomUUID(),
    ...entry,
    created_at: new Date().toISOString(),
  });
  writeLocalLog(log);
}

/** @param {string} english_key */
export async function findActiveCardsByKey(english_key) {
  const key = normalizeEnglishKey(english_key);
  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/translation_history`;
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("english_key", `eq.${key}`);
    params.set("revision_status", `in.(${ACTIVE_CARD_STATUSES.join(",")})`);
    params.set("order", "updated_at.desc");
    const res = await fetch(`${base}?${params}`, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  }
  return readLocalCards()
    .filter(
      (r) =>
        r.english_key === key && ACTIVE_CARD_STATUSES.includes(r.revision_status)
    )
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
}

/** @param {string} english_key @param {string} thai_word */
export async function findCardByKeyAndThai(english_key, thai_word) {
  const key = normalizeEnglishKey(english_key);
  const thai = String(thai_word || "").trim();
  const cards = await listCards({ q: "", limit: 500, include_archived: true });
  return (
    cards.find((c) => c.english_key === key && c.thai_word === thai) || null
  );
}

/** @param {string} id */
export async function getCardById(id) {
  if (!id) return null;
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/translation_history?id=eq.${encodeURIComponent(id)}&select=*`;
    const res = await fetch(url, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data[0] : null;
  }
  return readLocalCards().find((r) => r.id === id) || null;
}

/**
 * @param {{ q?: string, limit?: number, status?: string, include_archived?: boolean }} opts
 */
export async function listCards(opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 500);
  const q = (opts.q || "").trim().toLowerCase();
  const status = (opts.status || "").trim();
  const includeArchived = opts.include_archived === true || opts.include_archived === "true";

  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/translation_history`;
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "updated_at.desc");
    params.set("limit", String(limit));
    if (status && status !== "all" && REVISION_STATUSES.includes(status)) {
      params.set("revision_status", `eq.${status}`);
    } else if (!includeArchived) {
      params.set("revision_status", `neq.archived`);
    }
    if (q) {
      params.set(
        "or",
        `(english_input.ilike.*${q}*,english_key.ilike.*${q}*,thai_word.ilike.*${q}*,meaning_en.ilike.*${q}*,chinese_traditional.ilike.*${q}*,roman_syllables.ilike.*${q}*,roman_compact.ilike.*${q}*)`
      );
    }
    const res = await fetch(`${base}?${params}`, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || "Supabase list failed");
      err.code = "DB";
      throw err;
    }
    return data;
  }

  let rows = readLocalCards();
  if (status && status !== "all" && REVISION_STATUSES.includes(status)) {
    rows = rows.filter((r) => r.revision_status === status);
  } else if (!includeArchived) {
    rows = rows.filter((r) => r.revision_status !== "archived");
  }
  if (q) {
    rows = rows.filter((r) => {
      const hay = [
        r.english_input,
        r.english_key,
        r.thai_word,
        r.meaning_en,
        r.chinese_traditional,
        r.roman_syllables,
        r.roman_compact,
        r.notes,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }
  rows.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  return rows.slice(0, limit);
}

/** backward compat */
export async function listHistory(opts) {
  return listCards(opts);
}

/**
 * @param {string} english_input
 * @param {import("./schema.mjs").TranslationResult} translation
 * @param {{ notes?: string, revision_status?: string, original_input?: string, card_id?: string }} [meta]
 */
export async function saveCard(english_input, translation, meta = {}) {
  const english_key = normalizeEnglishKey(english_input);
  const existingBySense = await findCardByKeyAndThai(english_key, translation.thai_word);
  if (meta.card_id) {
    return updateHistory(meta.card_id, {
      english_input,
      translation,
      notes: meta.notes,
      revision_status: meta.revision_status || "current",
      original_input: meta.original_input,
    });
  }
  if (existingBySense) {
    return updateHistory(existingBySense.id, {
      english_input,
      translation,
      notes: meta.notes ?? existingBySense.notes,
      revision_status: meta.revision_status || existingBySense.revision_status,
      original_input: meta.original_input ?? existingBySense.original_input,
    });
  }

  const row = rowFromTranslation(english_input, english_key, translation, meta);

  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/translation_history`;
    const res = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify(row),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || "Supabase insert failed");
      err.code = "DB";
      throw err;
    }
    return Array.isArray(data) ? data[0] : data;
  }

  const rows = readLocalCards();
  const entry = {
    id: randomUUID(),
    ...row,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  rows.unshift(entry);
  writeLocalCards(rows);
  return entry;
}

export async function insertTranslation(english_input, translation, meta) {
  return saveCard(english_input, translation, meta);
}

/**
 * @param {string} id
 * @param {{ notes?: string, revision_status?: string, translation?: import("./schema.mjs").TranslationResult, english_input?: string, original_input?: string }} patch
 */
export async function updateHistory(id, patch) {
  if (!id) {
    const err = new Error("Missing id");
    err.code = "VALIDATION";
    throw err;
  }
  if (patch.revision_status && !REVISION_STATUSES.includes(patch.revision_status)) {
    const err = new Error("Invalid revision_status");
    err.code = "VALIDATION";
    throw err;
  }

  const english_input = patch.english_input;
  const english_key =
    english_input !== undefined ? normalizeEnglishKey(english_input) : undefined;

  if (useSupabase()) {
    const body = { updated_at: new Date().toISOString() };
    if (patch.notes !== undefined) body.notes = patch.notes;
    if (patch.revision_status !== undefined) body.revision_status = patch.revision_status;
    if (patch.original_input !== undefined) body.original_input = patch.original_input;
    if (english_input !== undefined) {
      body.english_input = english_input;
      body.english_key = english_key;
    }
    if (patch.translation) {
      Object.assign(
        body,
        rowFromTranslation(
          english_input || "",
          english_key || "",
          patch.translation,
          patch
        )
      );
    }
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/translation_history?id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || "Supabase update failed");
      err.code = "DB";
      throw err;
    }
    return Array.isArray(data) ? data[0] : data;
  }

  const rows = readLocalCards();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) {
    const err = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const prev = rows[idx];
  const next = { ...prev, updated_at: new Date().toISOString() };
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.revision_status !== undefined) next.revision_status = patch.revision_status;
  if (patch.original_input !== undefined) next.original_input = patch.original_input;
  if (english_input !== undefined) {
    next.english_input = english_input;
    next.english_key = english_key;
  }
  if (patch.translation) {
    Object.assign(
      next,
      rowFromTranslation(
        english_input || prev.english_input,
        english_key || prev.english_key,
        patch.translation,
        { ...patch, notes: patch.notes ?? prev.notes, revision_status: patch.revision_status ?? prev.revision_status }
      )
    );
  }
  rows[idx] = next;
  writeLocalCards(rows);
  return next;
}

/** @param {string} id */
export async function deleteHistory(id) {
  if (!id) {
    const err = new Error("Missing id");
    err.code = "VALIDATION";
    throw err;
  }

  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/translation_history?id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: "DELETE", headers: supabaseHeaders() });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const err = new Error(data?.message || "Supabase delete failed");
      err.code = "DB";
      throw err;
    }
    await deleteLinksForCard(id);
    return { ok: true };
  }

  const rows = readLocalCards();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) {
    const err = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  writeLocalCards(next);
  const links = readLocalLinks().filter(
    (l) => l.from_id !== id && l.to_id !== id
  );
  writeLocalLinks(links);
  return { ok: true };
}

async function deleteLinksForCard(cardId) {
  if (!useSupabase()) return;
  const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/card_links`;
  await fetch(`${base}?or=(from_id.eq.${cardId},to_id.eq.${cardId})`, {
    method: "DELETE",
    headers: supabaseHeaders(),
  });
}

/** @param {string} cardId */
export async function getLinksForCard(cardId) {
  if (!cardId) return [];
  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/card_links`;
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("or", `(from_id.eq.${cardId},to_id.eq.${cardId})`);
    const res = await fetch(`${base}?${params}`, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  }
  return readLocalLinks().filter(
    (l) => l.from_id === cardId || l.to_id === cardId
  );
}

/**
 * @param {{ from_id: string, to_id: string, relation: string }} link
 */
export async function addCardLink(link) {
  const relation = LINK_RELATIONS.includes(link.relation)
    ? link.relation
    : "same_topic";
  if (!link.from_id || !link.to_id || link.from_id === link.to_id) {
    const err = new Error("Invalid link");
    err.code = "VALIDATION";
    throw err;
  }

  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/card_links`;
    const res = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        from_id: link.from_id,
        to_id: link.to_id,
        relation,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || "Link insert failed");
      err.code = "DB";
      throw err;
    }
    return Array.isArray(data) ? data[0] : data;
  }

  const links = readLocalLinks();
  const dup = links.find(
    (l) =>
      (l.from_id === link.from_id && l.to_id === link.to_id) ||
      (l.from_id === link.to_id && l.to_id === link.from_id)
  );
  if (dup) return dup;
  const entry = {
    id: randomUUID(),
    from_id: link.from_id,
    to_id: link.to_id,
    relation,
    created_at: new Date().toISOString(),
  };
  links.unshift(entry);
  writeLocalLinks(links);
  return entry;
}

/** @param {string} linkId */
export async function removeCardLink(linkId) {
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/card_links?id=eq.${encodeURIComponent(linkId)}`;
    await fetch(url, { method: "DELETE", headers: supabaseHeaders() });
    return { ok: true };
  }
  writeLocalLinks(readLocalLinks().filter((l) => l.id !== linkId));
  return { ok: true };
}

/** @param {string} cardId @param {import("./schema.mjs").TranslationResult[]} allCards */
export function computeWeakLinks(cardId, card, allCards) {
  const thai = String(card.thai_word || "").trim();
  if (!thai || thai.length < 2) return [];
  const out = [];
  for (const other of allCards) {
    if (other.id === cardId) continue;
    const ex = String(other.example_thai || "");
    if (ex.includes(thai)) {
      out.push({
        card_id: other.id,
        english_input: other.english_input,
        thai_word: other.thai_word,
        relation: "often_with",
        reason: "Thai headword appears in this card's example",
        weak: true,
      });
    }
  }
  return out.slice(0, 6);
}

/** Resolve link rows to card summaries */
export async function resolveLinks(cardId) {
  const card = await getCardById(cardId);
  if (!card) return { links: [], weak: [] };
  const all = await listCards({ limit: 500, include_archived: false });
  const raw = await getLinksForCard(cardId);
  const links = [];
  for (const l of raw) {
    const otherId = l.from_id === cardId ? l.to_id : l.from_id;
    const other = all.find((c) => c.id === otherId) || (await getCardById(otherId));
    if (!other) continue;
    links.push({
      link_id: l.id,
      relation: l.relation,
      card_id: other.id,
      english_input: other.english_input,
      thai_word: other.thai_word,
      chinese_traditional: other.chinese_traditional,
    });
  }
  const weak = computeWeakLinks(cardId, card, all);
  return { links, weak };
}

function readLocalReviewStates() {
  try {
    const raw = fs.readFileSync(REVIEW_STATE_FILE, "utf8");
    const data = JSON.parse(raw);
    const rows = Array.isArray(data) ? data : [];
    const map = {};
    for (const r of rows) {
      if (r && r.card_id) map[r.card_id] = r;
    }
    return map;
  } catch (e) {
    if (e && e.code === "ENOENT") return {};
    throw e;
  }
}

function writeLocalReviewStates(map) {
  fs.mkdirSync(path.dirname(REVIEW_STATE_FILE), { recursive: true });
  const rows = Object.values(map);
  fs.writeFileSync(REVIEW_STATE_FILE, JSON.stringify(rows, null, 2), "utf8");
}

function todayDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysToIso(isoDate, days) {
  const d = new Date(isoDate + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** @returns {Promise<Record<string, { card_id: string, interval_days: number, due_on: string, last_rating?: string, updated_at?: string }>>} */
export async function getReviewStateMap() {
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/review_state?select=*`;
    const res = await fetch(url, { headers: supabaseHeaders() });
    if (res.status === 404) return readLocalReviewStates();
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      if (data?.code === "PGRST205" || String(data?.message || "").includes("review_state")) {
        return readLocalReviewStates();
      }
      return readLocalReviewStates();
    }
    const map = {};
    if (Array.isArray(data)) {
      for (const r of data) map[r.card_id] = r;
    }
    return map;
  }
  return readLocalReviewStates();
}

/**
 * @param {string} cardId
 * @param {"again"|"hard"|"good"} rating
 */
export async function applyRecallRating(cardId, rating) {
  const allowed = ["again", "hard", "good"];
  if (!allowed.includes(rating)) {
    const err = new Error("Invalid rating");
    err.code = "VALIDATION";
    throw err;
  }
  const card = await getCardById(cardId);
  if (!card) {
    const err = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const today = todayDateIso();
  const prev = (await getReviewStateMap())[cardId] || {
    card_id: cardId,
    interval_days: 0,
    due_on: today,
  };
  let interval = Number(prev.interval_days) || 0;
  let due_on = today;
  if (rating === "again") {
    interval = 0;
    due_on = today;
  } else if (rating === "hard") {
    interval = 1;
    due_on = addDaysToIso(today, 1);
  } else {
    interval = Math.min(30, Math.max(1, interval > 0 ? interval * 2 : 1));
    due_on = addDaysToIso(today, interval);
  }
  const row = {
    card_id: cardId,
    interval_days: interval,
    due_on,
    last_rating: rating,
    updated_at: new Date().toISOString(),
  };

  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/review_state`;
    const res = await fetch(base, {
      method: "POST",
      headers: { ...supabaseHeaders(), Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(row),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      return Array.isArray(data) ? data[0] : row;
    }
  }
  const map = readLocalReviewStates();
  map[cardId] = row;
  writeLocalReviewStates(map);
  return row;
}

/** @param {number} [days] */
export async function recentLookupCardIds(days = 14) {
  const cutoff = Date.now() - days * 86400000;
  const ids = new Set();
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/lookup_log?select=card_id,created_at&order=created_at.desc&limit=200`;
    const res = await fetch(url, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    if (Array.isArray(data)) {
      for (const row of data) {
        if (!row.card_id) continue;
        const t = new Date(row.created_at).getTime();
        if (t >= cutoff) ids.add(row.card_id);
      }
    }
    return ids;
  }
  for (const row of readLocalLog()) {
    if (!row.card_id) continue;
    const t = new Date(row.created_at || 0).getTime();
    if (t >= cutoff) ids.add(row.card_id);
  }
  return ids;
}

export async function buildTodayQueue() {
  const cards = await listCards({ limit: 500, include_archived: false });
  const practiceable = cards.filter(
    (c) => c.revision_status !== "draft" && c.revision_status !== "archived"
  );
  const states = await getReviewStateMap();
  const recent = await recentLookupCardIds(14);
  const today = todayDateIso();

  const due = [];
  const recentNew = [];
  const other = [];

  for (const card of practiceable) {
    const st = states[card.id];
    if (st && st.due_on && String(st.due_on) <= today) {
      due.push({ card, sort: st.due_on });
    } else if (!st && recent.has(card.id)) {
      recentNew.push(card);
    } else if (!st) {
      other.push(card);
    }
  }
  due.sort((a, b) => String(a.sort).localeCompare(String(b.sort)));
  const items = [
    ...due.map((x) => x.card),
    ...recentNew,
    ...other,
  ].slice(0, 10);
  return { items, due_count: due.length, total_practiceable: practiceable.length };
}

/**
 * @param {string[]} ids
 * @param {{ revision_status?: string, notes?: string }} patch
 */
export async function batchUpdateCards(ids, patch) {
  const out = [];
  for (const id of ids) {
    if (!id) continue;
    out.push(await updateHistory(id, patch));
  }
  return out;
}

function readLocalChallengeTopics() {
  try {
    const raw = fs.readFileSync(CHALLENGE_TOPICS_FILE, "utf8");
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    if (e && e.code === "ENOENT") return [];
    throw e;
  }
}

function writeLocalChallengeTopics(rows) {
  fs.mkdirSync(path.dirname(CHALLENGE_TOPICS_FILE), { recursive: true });
  fs.writeFileSync(CHALLENGE_TOPICS_FILE, JSON.stringify(rows, null, 2), "utf8");
}

/** @param {Record<string, unknown>} payload */
function challengeRowFromPayload(payload) {
  return {
    prompt: String(payload.prompt || ""),
    topic_en: String(payload.topic_en || ""),
    note_en: String(payload.note_en || ""),
    web_mode_requested: String(payload.web_mode_requested || "auto"),
    web_decision: String(payload.web_decision || "practice"),
    web_decision_reason: String(payload.web_decision_reason || ""),
    web_used: !!payload.web_used,
    web_search_error: String(payload.web_search_error || ""),
    source_links: Array.isArray(payload.source_links) ? payload.source_links : [],
    sentences: Array.isArray(payload.sentences) ? payload.sentences : [],
    notes: String(payload.notes || ""),
    revision_status: REVISION_STATUSES.includes(String(payload.revision_status))
      ? String(payload.revision_status)
      : "current",
  };
}

/**
 * @param {{ q?: string, limit?: number, status?: string, include_archived?: boolean }} [opts]
 */
export async function listChallengeTopics(opts = {}) {
  const limit = Math.min(Math.max(Number(opts.limit) || 50, 1), 200);
  const q = (opts.q || "").trim().toLowerCase();
  const status = (opts.status || "").trim();
  const includeArchived =
    opts.include_archived === true || opts.include_archived === "true";

  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/challenge_topics`;
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("order", "updated_at.desc");
    params.set("limit", String(limit));
    if (status && status !== "all" && REVISION_STATUSES.includes(status)) {
      params.set("revision_status", `eq.${status}`);
    } else if (!includeArchived) {
      params.set("revision_status", `neq.archived`);
    }
    if (q) {
      params.set(
        "or",
        `(prompt.ilike.*${q}*,topic_en.ilike.*${q}*,note_en.ilike.*${q}*)`
      );
    }
    const res = await fetch(`${base}?${params}`, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      if (String(data?.code || "").includes("PGRST") || res.status === 404) {
        return readLocalChallengeTopics()
          .filter(localFilterChallengeTopics(q, status, includeArchived))
          .slice(0, limit);
      }
      const err = new Error(data?.message || "Supabase challenge list failed");
      err.code = "DB";
      throw err;
    }
    const remote = Array.isArray(data) ? data : [];
    const merged = mergeChallengeTopicSources(remote, readLocalChallengeTopics());
    return finishChallengeTopicList(merged, q, status, includeArchived, limit);
  }

  return finishChallengeTopicList(readLocalChallengeTopics(), q, status, includeArchived, limit);
}

function localFilterChallengeTopics(q, status, includeArchived) {
  return (r) => {
    if (status && status !== "all" && REVISION_STATUSES.includes(status)) {
      if (r.revision_status !== status) return false;
    } else if (!includeArchived && r.revision_status === "archived") {
      return false;
    }
    if (!q) return true;
    const hay = [r.prompt, r.topic_en, r.note_en, r.notes]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };
}

function mergeChallengeTopicSources(remoteRows, localRows) {
  const map = new Map();
  for (const r of remoteRows || []) {
    if (r && r.id) map.set(r.id, r);
  }
  for (const r of localRows || []) {
    if (r && r.id && !map.has(r.id)) map.set(r.id, r);
  }
  return [...map.values()];
}

function finishChallengeTopicList(rows, q, status, includeArchived, limit) {
  let out = (rows || []).filter(localFilterChallengeTopics(q, status, includeArchived));
  out.sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
  return out.slice(0, limit);
}

/** @param {string} id */
export async function getChallengeTopicById(id) {
  if (!id) return null;
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/challenge_topics?id=eq.${encodeURIComponent(id)}&select=*`;
    const res = await fetch(url, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      return readLocalChallengeTopics().find((r) => r.id === id) || null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (row) return row;
    return readLocalChallengeTopics().find((r) => r.id === id) || null;
  }
  return readLocalChallengeTopics().find((r) => r.id === id) || null;
}

/** @param {Record<string, unknown>} payload */
export async function insertChallengeTopic(payload) {
  const row = challengeRowFromPayload(payload);
  const now = new Date().toISOString();

  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/challenge_topics`;
    const res = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ ...row, updated_at: now }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return insertChallengeTopicLocal(payload);
    }
    const saved = Array.isArray(data) ? data[0] : data;
    if (saved && saved.id) return saved;
    return insertChallengeTopicLocal(payload);
  }
  return insertChallengeTopicLocal(payload);
}

function insertChallengeTopicLocal(payload) {
  const row = challengeRowFromPayload(payload);
  const entry = {
    id: randomUUID(),
    ...row,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const rows = readLocalChallengeTopics();
  rows.unshift(entry);
  writeLocalChallengeTopics(rows);
  return entry;
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} payload
 */
export async function updateChallengeTopic(id, payload) {
  if (!id) {
    const err = new Error("Missing id");
    err.code = "VALIDATION";
    throw err;
  }
  const existing = await getChallengeTopicById(id);
  if (!existing) {
    const err = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }

  const content = payload.content ? challengeRowFromPayload(payload.content) : null;
  const notes =
    payload.notes !== undefined ? String(payload.notes) : undefined;
  const revision_status =
    payload.revision_status !== undefined
      ? String(payload.revision_status)
      : undefined;

  if (revision_status && !REVISION_STATUSES.includes(revision_status)) {
    const err = new Error("Invalid revision_status");
    err.code = "VALIDATION";
    throw err;
  }

  const now = new Date().toISOString();

  if (useSupabase()) {
    const body = { updated_at: now };
    if (content) Object.assign(body, content);
    if (notes !== undefined) body.notes = notes;
    if (revision_status !== undefined) body.revision_status = revision_status;
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/challenge_topics?id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: supabaseHeaders(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return updateChallengeTopicLocal(id, { content, notes, revision_status });
    }
    return Array.isArray(data) ? data[0] : data;
  }
  return updateChallengeTopicLocal(id, { content, notes, revision_status });
}

function updateChallengeTopicLocal(id, patch) {
  const rows = readLocalChallengeTopics();
  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) {
    const err = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  const next = {
    ...rows[idx],
    updated_at: new Date().toISOString(),
  };
  if (patch.content) Object.assign(next, patch.content);
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.revision_status !== undefined) {
    next.revision_status = patch.revision_status;
  }
  rows[idx] = next;
  writeLocalChallengeTopics(rows);
  return next;
}

/** @param {string} id */
export async function deleteChallengeTopic(id) {
  if (!id) {
    const err = new Error("Missing id");
    err.code = "VALIDATION";
    throw err;
  }
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/challenge_topics?id=eq.${encodeURIComponent(id)}`;
    const res = await fetch(url, { method: "DELETE", headers: supabaseHeaders() });
    if (!res.ok) {
      deleteChallengeTopicLocal(id);
      return { ok: true };
    }
    return { ok: true };
  }
  deleteChallengeTopicLocal(id);
  return { ok: true };
}

function deleteChallengeTopicLocal(id) {
  const rows = readLocalChallengeTopics();
  const next = rows.filter((r) => r.id !== id);
  if (next.length === rows.length) {
    const err = new Error("Not found");
    err.code = "NOT_FOUND";
    throw err;
  }
  writeLocalChallengeTopics(next);
}

/** @param {Record<string, unknown>} generated */
export async function saveChallengeFromGeneration(generated, meta = {}) {
  const row = {
    prompt: generated.prompt,
    topic_en: generated.topic_en,
    note_en: generated.note_en,
    web_mode_requested: generated.web_mode_requested,
    web_decision: generated.web_decision,
    web_decision_reason: generated.web_decision_reason,
    web_used: generated.web_used,
    web_search_error: generated.web_search_error || "",
    source_links: generated.source_links || [],
    sentences: generated.sentences || [],
    notes: meta.notes || "",
    revision_status: meta.revision_status || "current",
  };
  return insertChallengeTopic(row);
}

export { normalizeEnglishKey };

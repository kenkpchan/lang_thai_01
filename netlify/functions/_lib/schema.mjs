/** @typedef {object} TranslationResult
 * @property {string} thai_word
 * @property {string} roman_syllables
 * @property {string} roman_compact
 * @property {string} chinese_traditional
 * @property {string} meaning_en
 * @property {string} example_thai
 * @property {string} example_roman
 * @property {string} example_chinese
 */

/** @typedef {object} TranslationMeta
 * @property {boolean} input_ok
 * @property {string} suggested_english
 * @property {"high"|"medium"|"low"} confidence
 * @property {TranslationResult} translation
 */

export const REVISION_STATUSES = ["current", "draft", "reviewed", "archived"];

export const LINK_RELATIONS = [
  "synonym",
  "formal_variant",
  "opposite",
  "often_with",
  "same_topic",
];

export const ACTIVE_CARD_STATUSES = ["current", "reviewed"];

/** @param {string} s */
export function normalizeEnglishKey(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** @param {unknown} raw */
export function normalizeTranslation(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const pick = (key) => String(o[key] ?? "").trim();
  const result = {
    thai_word: pick("thai_word"),
    roman_syllables: pick("roman_syllables"),
    roman_compact: pick("roman_compact"),
    chinese_traditional: pick("chinese_traditional"),
    meaning_en: pick("meaning_en"),
    example_thai: pick("example_thai"),
    example_roman: pick("example_roman"),
    example_chinese: pick("example_chinese"),
  };
  if (!result.thai_word || !result.meaning_en) return null;
  return result;
}

/** @param {unknown} raw */
export function parseTranslationMeta(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const translation = normalizeTranslation(o);
  if (!translation) return null;
  const conf = String(o.confidence || "high").toLowerCase();
  const confidence = conf === "low" || conf === "medium" ? conf : "high";
  const inputOk = o.input_ok !== false && o.input_ok !== "false";
  const suggested = String(o.suggested_english ?? "").trim();
  return {
    input_ok: inputOk,
    suggested_english: suggested,
    confidence,
    translation,
  };
}

import { normalizeTranslation, parseTranslationMeta } from "./schema.mjs";

const SYSTEM_PROMPT = `You are a Thai language tutor for English speakers who also read Traditional Chinese.

Given an English word or short phrase, return ONE best everyday Thai equivalent (most common, learner-friendly).

Respond with ONLY valid JSON (no markdown fences) using exactly these keys:
{
  "input_ok": true,
  "suggested_english": "corrected English if the user had a typo; otherwise repeat their phrase exactly",
  "confidence": "high",
  "thai_word": "Thai script for the headword or short phrase",
  "roman_syllables": "syllable romanization with hyphens, tone marks on vowels (e.g. bprà-sòp-gaan)",
  "roman_compact": "same word without hyphens (e.g. prasopkan)",
  "chinese_traditional": "Traditional Chinese gloss",
  "meaning_en": "One clear English sentence starting with 'The main word for …' when translating a noun/verb, explaining everyday usage in parentheses if helpful",
  "example_thai": "One practical daily-life Thai sentence using the word naturally",
  "example_roman": "Romanization of the example sentence (learner-friendly, tone marks on vowels)",
  "example_chinese": "Traditional Chinese translation of the example sentence"
}

Spelling / input rules:
- Set input_ok to false only if the input is not plausible English or is ambiguous between two different words (e.g. their/there).
- For clear typos (experiance → experience), set input_ok true, suggested_english to the fix, confidence high.
- For homophones or unclear intent, input_ok false, confidence low or medium, suggested_english empty or your best guess.
- confidence is high, medium, or low.

Translation rules:
- Prioritize the most useful spoken Thai, not literal dictionary lists.
- Keep romanization consistent with the workshop style (à low, â falling, á high, ǎ rising, unmarked mid).
- example must be simple A1–A2 level when possible.
- chinese_traditional must use Traditional characters (繁體).`;

const LINKS_PROMPT = `You suggest vocabulary relations for Thai learners. Given one English headword and its Thai card, return JSON:
{
  "links": [
    { "english": "related English word", "relation": "synonym|formal_variant|opposite|often_with|same_topic", "reason": "short English why" }
  ]
}
At most 4 links. Only common learner-useful relations.`;

const CHALLENGE_PROMPT = `You write short Thai reading practice for English-speaking learners.

The user gives a topic or request in English (e.g. "top Thailand headline news", "weather in Bangkok", "ordering coffee politely").

Return ONLY valid JSON (no markdown fences):
{
  "topic_en": "Short English label for what you wrote",
  "note_en": "One sentence telling the learner this is AI practice text for the theme, not live news or real-time data.",
  "sentences": [
    {
      "thai": "One complete Thai sentence.",
      "roman": "Romanization of that sentence only; tone marks on vowels (à low, â falling, á high, ǎ rising, unmarked mid)",
      "english": "Natural English translation of that Thai sentence",
      "chinese_traditional": "Traditional Chinese translation of the Thai sentence (繁體)",
      "guide": {
        "beginner": {
          "strategy": "One short imperative reading tip.",
          "hint_roman": "How to read the romanization (syllables or tone), not the full roman line",
          "hint_en": "How to guess the English meaning",
          "hint_zh": "繁體提示：如何理解這句（不是整句翻譯）",
          "chunks": [
            { "thai": "substring", "role": "who|does|what|where|when|not", "hint_en": "chunk gloss only" }
          ],
          "ignore": ["ค่ะ"]
        },
        "intermediate": {
          "strategy": "One short tip on clauses or omitted words.",
          "hint_roman": "Roman reading tip for this sentence",
          "hint_en": "English structure tip",
          "hint_zh": "繁體結構提示",
          "clauses": [
            { "thai": "substring", "job": "main event|extra detail|which thing|contrast|time" }
          ],
          "omitted": "or empty string",
          "watch": "or empty string"
        }
      }
    }
  ]
}

JSON rules (strict):
- Maximum 4 sentences. Minimum 2.
- Valid JSON only: double-quoted keys and strings, no trailing commas, no line breaks inside string values.
- Escape " inside strings as \\".

Rules:
- Keep each sentence about A2–B1 difficulty: clear, useful, natural Thai.
- Match the theme (news-style for headlines, dialogue for ordering coffee, etc.).
- Do not invent dated breaking news or claim to report today's real headlines; write plausible practice sentences instead.
- roman must match the Thai sentence syllable-for-syllable in workshop style.
- For each sentence, guide.beginner: 2–4 chunks whose thai substrings appear in the sentence; hint_en must not restate the whole sentence.
- guide.intermediate: 1–2 clauses; omitted and watch are short; do not teach tone rules in watch unless it is a word-meaning mix-up.

Hint triplet rules (required for both beginner and intermediate):
- hint_roman: REQUIRED. Latin romanization only (with à â á ǎ tone marks). Walk through syllables from the sentence "roman" field, e.g. "mâi · sài · naam-dtaan — falling, falling, mid…". No Thai script in hint_roman.
- hint_en: English words only. No Thai characters. Short gloss strategy, e.g. "not · put in · sugar".
- hint_zh: Traditional Chinese only. No Thai characters, e.g. "不要 · 加入 · 糖".`;

const CHALLENGE_WEB_PROMPT = `You write Thai reading practice for English-speaking learners using ONLY the web sources provided in the user message (JSON with user_prompt and web_sources).

Return ONLY valid JSON (no markdown fences):
{
  "topic_en": "Short English label",
  "note_en": "One sentence: Thai practice based on web search results (not a full news article). Mention that facts come from the linked sources.",
  "source_links": [
    { "title": "Page title from a source", "url": "https://..." }
  ],
  "sentences": [
    {
      "thai": "One complete Thai sentence grounded in the sources.",
      "roman": "Romanization with tone marks (à low, â falling, á high, ǎ rising, unmarked mid)",
      "english": "English translation",
      "chinese_traditional": "繁體 translation",
      "guide": {
        "beginner": { "strategy": "...", "hint_roman": "...", "hint_en": "...", "hint_zh": "...", "chunks": [], "ignore": [] },
        "intermediate": { "strategy": "...", "hint_roman": "...", "hint_en": "...", "hint_zh": "...", "clauses": [], "omitted": "", "watch": "" }
      }
    }
  ]
}

JSON rules (strict):
- Maximum 4 sentences. Valid JSON only; no trailing commas; no raw line breaks inside strings.

Rules:
- Use facts only from web_sources; do not invent events, dates, or quotes not supported by the snippets.
- Write 3–4 Thai sentences at A2–B1 level summarizing themes from the sources.
- source_links: up to 5 entries copied from provided URLs (title may be shortened).
- If sources are thin, write cautious sentences (e.g. "reports say…") still in Thai.
- Same guide rules as offline challenge: chunks/clauses must match substrings in each Thai sentence.
- Do not claim you browsed beyond the given snippets.
- hint_roman required (Latin + tone marks); hint_en English-only; hint_zh 繁體-only — never put Thai script in hint_en or hint_zh.`;

const CHALLENGE_ROUTE_PROMPT = `You route a Thai-learning "Challenge" prompt.

The app can either:
A) Search the live web (weather today, news headlines, current events, real-time facts), then write Thai practice sentences from results.
B) Skip web search and write conversational Thai practice (dialogues, ordering coffee, greetings, timeless scenarios).

Return ONLY valid JSON:
{ "needs_web": true or false, "reason_en": "One short English sentence for the learner" }

needs_web = true when the user wants current/real-world facts that change over time, e.g. weather today, top news now, latest score, stock price, what happened this week in Thailand.

needs_web = false for roleplay, buying coffee, travel phrases, grammar themes, hypothetical or timeless situations, or generic "how to say X" without asking for today's real data.

JSON only; no markdown.`;

/** @param {string} prompt */
export async function classifyChallengeWebNeed(prompt) {
  const text = String(prompt || "").trim();
  if (!text) {
    return { needs_web: false, reason_en: "Empty prompt." };
  }
  try {
    const parsed = await chatJson(
      CHALLENGE_ROUTE_PROMPT,
      text,
      { temperature: 0.1, max_tokens: 256 }
    );
    const needs =
      parsed.needs_web === true ||
      parsed.needs_web === "true" ||
      parsed.needs_web === 1;
    return {
      needs_web: needs,
      reason_en: String(parsed.reason_en || "").trim() || (needs ? "Looks like a current-events question." : "Looks like conversational practice."),
    };
  } catch {
    const p = text.toLowerCase();
    const live =
      /\b(today|tonight|now|current|latest|headline|news|weather|score|stock|price|happened this week)\b/.test(
        p
      ) || /\bwhat is the .* today\b/.test(p);
    return {
      needs_web: live,
      reason_en: live
        ? "Matched live-data keywords (fallback routing)."
        : "Conversational practice (fallback routing).",
    };
  }
}

async function chatJson(system, user, options) {
  options = options || {};
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY is not configured on the server.");
    err.code = "CONFIG";
    throw err;
  }
  const base = (process.env.OPENAI_BASE_URL || "https://api.deepseek.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL || "deepseek-chat";

  let res;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: options.temperature != null ? options.temperature : 0.3,
        response_format: { type: "json_object" },
        max_tokens: options.max_tokens ?? 4096,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (e) {
    const hint =
      e?.cause?.code === "UND_ERR_CONNECT_TIMEOUT" || e?.message === "fetch failed"
        ? " Check HTTP_PROXY/HTTPS_PROXY and NODE_USE_ENV_PROXY=1 on this PC."
        : "";
    const err = new Error((e?.message || "Network error") + hint);
    err.code = "NETWORK";
    throw err;
  }

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload.error?.message || res.statusText || "AI request failed";
    const err = new Error(msg);
    err.code = "AI";
    throw err;
  }

  const text = payload.choices?.[0]?.message?.content;
  if (!text) {
    const err = new Error("Empty AI response");
    err.code = "AI";
    throw err;
  }

  return parseAiJson(text);
}

/** @param {string} text */
function parseAiJson(text) {
  let s = String(text || "").trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  }
  const tries = [
    () => JSON.parse(s),
    () => {
      const m = s.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON object in response");
      return JSON.parse(m[0]);
    },
    () => {
      const m = s.match(/\{[\s\S]*\}/);
      if (!m) throw new Error("No JSON object");
      let j = m[0]
        .replace(/[\u201c\u201d\u2018\u2019]/g, '"')
        .replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(j);
    },
  ];
  let last;
  for (const fn of tries) {
    try {
      return fn();
    } catch (e) {
      last = e;
    }
  }
  const err = new Error(last?.message || "Could not parse AI JSON");
  err.code = "AI";
  throw err;
}

/**
 * @param {string} english
 * @returns {Promise<import("./schema.mjs").TranslationMeta>}
 */
export async function translateWithMeta(english) {
  const parsed = await chatJson(SYSTEM_PROMPT, english);
  const meta = parseTranslationMeta(parsed);
  if (!meta) {
    const err = new Error("AI JSON missing required fields");
    err.code = "AI";
    throw err;
  }
  if (!meta.suggested_english) {
    meta.suggested_english = english.trim();
  }
  return meta;
}

/**
 * @param {string} english
 * @returns {Promise<import("./schema.mjs").TranslationResult>}
 */
export async function translateEnglish(english) {
  const meta = await translateWithMeta(english);
  return meta.translation;
}

const CHUNK_ROLES = new Set(["who", "does", "what", "where", "when", "not"]);
const CLAUSE_JOBS = new Set([
  "main event",
  "extra detail",
  "which thing",
  "contrast",
  "time",
]);

/** @param {unknown} raw */
function hasThaiScript(s) {
  return /[\u0E00-\u0E7F]/.test(String(s || ""));
}

/** @param {string} roman */
function fallbackRomanHint(roman) {
  const r = String(roman || "").trim();
  if (!r) {
    return "Read the full Roman line below syllable by syllable (à low, â falling, á high, ǎ rising, plain = mid).";
  }
  const parts = r
    .split(/\s*-\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  const joined = parts.length ? parts.join(" · ") : r;
  return (
    "Read aloud: " +
    joined +
    ". Tone marks: à low, â falling, á high, ǎ rising, unmarked = mid."
  );
}

/** @param {Record<string, unknown>} o @param {string} [romanLine] */
function pickGuideHints(o, romanLine) {
  let hint_roman = String(o.hint_roman || "").trim();
  let hint_en = String(o.hint_en || "").trim();
  let hint_zh = String(o.hint_zh || "").trim();

  if (!hint_roman || hasThaiScript(hint_roman)) {
    hint_roman = fallbackRomanHint(romanLine);
  }
  if (hasThaiScript(hint_en)) {
    hint_en =
      "Use the chunk list below — each Thai piece has a short English gloss there.";
  }
  if (hasThaiScript(hint_zh)) {
    hint_zh = "請先看下方詞組，再對照「完整句」的繁體譯文。";
  }
  return { hint_roman, hint_en, hint_zh };
}

/** @param {unknown} raw @param {string} [romanLine] */
function normalizeChallengeGuide(raw, romanLine) {
  const empty = {
    beginner: {
      strategy: "",
      hint_roman: "",
      hint_en: "",
      hint_zh: "",
      chunks: [],
      ignore: [],
    },
    intermediate: {
      strategy: "",
      hint_roman: "",
      hint_en: "",
      hint_zh: "",
      clauses: [],
      omitted: "",
      watch: "",
    },
  };
  if (!raw || typeof raw !== "object") return empty;
  const g = /** @type {Record<string, unknown>} */ (raw);
  const beg = g.beginner && typeof g.beginner === "object" ? g.beginner : {};
  const mid = g.intermediate && typeof g.intermediate === "object" ? g.intermediate : {};
  const bo = /** @type {Record<string, unknown>} */ (beg);
  const mo = /** @type {Record<string, unknown>} */ (mid);
  const chunks = Array.isArray(bo.chunks) ? bo.chunks : [];
  const clauses = Array.isArray(mo.clauses) ? mo.clauses : [];
  return {
    beginner: {
      strategy: String(bo.strategy || "").trim(),
      ...pickGuideHints(bo, romanLine),
      chunks: chunks
        .slice(0, 4)
        .map((c) => {
          const o = /** @type {Record<string, unknown>} */ (c || {});
          const role = String(o.role || "what").toLowerCase();
          return {
            thai: String(o.thai || "").trim(),
            role: CHUNK_ROLES.has(role) ? role : "what",
            hint_en: String(o.hint_en || "").trim(),
            skip: o.skip === true,
          };
        })
        .filter((c) => c.thai),
      ignore: (Array.isArray(bo.ignore) ? bo.ignore : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean)
        .slice(0, 4),
    },
    intermediate: {
      strategy: String(mo.strategy || "").trim(),
      ...pickGuideHints(mo, romanLine),
      clauses: clauses
        .slice(0, 2)
        .map((c) => {
          const o = /** @type {Record<string, unknown>} */ (c || {});
          const job = String(o.job || "main event").toLowerCase();
          return {
            thai: String(o.thai || "").trim(),
            job: CLAUSE_JOBS.has(job) ? job : "main event",
          };
        })
        .filter((c) => c.thai),
      omitted: String(mo.omitted || "").trim(),
      watch: String(mo.watch || "").trim(),
    },
  };
}

/**
 * @param {string} prompt
 * @param {{ webSources?: Array<{ title: string, url: string, content: string }> }} [opts]
 */
async function challengeFromAi(system, user) {
  const parsed = await chatJson(system, user, { temperature: 0.4, max_tokens: 4096 });
  const sentences = Array.isArray(parsed.sentences) ? parsed.sentences : [];
  const out = sentences
    .map((s) => {
      const thai = String(s.thai || "").trim();
      const english = String(s.english || "").trim();
      if (!thai || !english) return null;
      return {
        thai,
        roman: String(s.roman || "").trim(),
        english,
        chinese_traditional: String(s.chinese_traditional || "").trim(),
        guide: normalizeChallengeGuide(s.guide, String(s.roman || "").trim()),
      };
    })
    .filter(Boolean);
  if (out.length < 1) {
    const err = new Error("AI returned no usable sentences");
    err.code = "AI";
    throw err;
  }
  return { parsed, out };
}

export async function generateChallenge(prompt, opts = {}) {
  const webSources = opts.webSources || [];
  const useWeb = webSources.length > 0;
  const system = useWeb ? CHALLENGE_WEB_PROMPT : CHALLENGE_PROMPT;
  const user = useWeb
    ? JSON.stringify({
        user_prompt: prompt,
        web_sources: webSources.map((s) => ({
          title: s.title,
          url: s.url,
          snippet: (s.content || "").slice(0, 700),
        })),
      })
    : prompt;

  let parsed;
  let out;
  try {
    ({ parsed, out } = await challengeFromAi(system, user));
  } catch (e) {
    if (e.code !== "AI") throw e;
    const retrySystem =
      system +
      "\n\nYour previous reply was invalid JSON. Reply again with exactly 3 sentences, shorter strings, strict JSON.";
    ({ parsed, out } = await challengeFromAi(retrySystem, user));
  }
  let sourceLinks = [];
  if (useWeb) {
    const fromAi = Array.isArray(parsed.source_links) ? parsed.source_links : [];
    sourceLinks = fromAi
      .map((l) => ({
        title: String(l.title || "").trim(),
        url: String(l.url || "").trim(),
      }))
      .filter((l) => l.url)
      .slice(0, 5);
    if (!sourceLinks.length) {
      sourceLinks = webSources
        .filter((s) => s.url)
        .map((s) => ({ title: s.title || s.url, url: s.url }))
        .slice(0, 5);
    }
  }

  const defaultNote = useWeb
    ? "Thai practice based on web search results. Check the source links."
    : "Practice text generated for your topic.";

  return {
    topic_en: String(parsed.topic_en || prompt).trim(),
    note_en: String(parsed.note_en || defaultNote).trim(),
    sentences: out,
    source_links: sourceLinks,
    web_used: useWeb,
  };
}

export async function suggestLinkCandidates(card) {
  const parsed = await chatJson(
    LINKS_PROMPT,
    JSON.stringify({
      english: card.english_input,
      thai: card.thai_word,
      meaning: card.meaning_en,
    })
  );
  const links = Array.isArray(parsed.links) ? parsed.links : [];
  return links.slice(0, 4).map((l) => ({
    english: String(l.english || "").trim(),
    relation: String(l.relation || "same_topic").trim(),
    reason: String(l.reason || "").trim(),
  }));
}

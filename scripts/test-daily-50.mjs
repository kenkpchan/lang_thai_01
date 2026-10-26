/**
 * Batch-test translation API with 50 daily-life English words.
 *   node scripts/test-daily-50.mjs
 * Requires: translation API on 127.0.0.1:8765, user ken (or AUTH in env).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "http://127.0.0.1:8765/api";
const WORDS = [
  "hello", "thank you", "please", "sorry", "excuse me",
  "yes", "no", "good morning", "good night", "how much",
  "water", "rice", "food", "breakfast", "lunch",
  "dinner", "coffee", "tea", "spicy", "delicious",
  "bathroom", "toilet", "money", "change", "receipt",
  "cheap", "expensive", "buy", "sell", "market",
  "taxi", "bus", "train", "airport", "hotel",
  "room", "key", "phone", "wifi", "password",
  "work", "meeting", "office", "colleague", "boss",
  "friend", "family", "doctor", "hospital", "medicine",
];

function loadDotEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m || line.trimStart().startsWith("#")) return;
      process.env[m[1]] = m[2].trim();
    });
}

loadDotEnv();
process.env.NODE_USE_ENV_PROXY = process.env.NODE_USE_ENV_PROXY || "1";

const user = process.env.TEST_USER || "ken";
const pass = process.env.TEST_PASSWORD || "0234";

async function api(path, options = {}) {
  const res = await fetch(API + path, options);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const login = await api("/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (!login.ok) {
    console.error("Login failed:", login.status, login.data);
    process.exit(1);
  }
  const token = login.data.token;
  const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  const results = [];
  let ok = 0;
  let cache = 0;
  let fail = 0;

  for (let i = 0; i < WORDS.length; i++) {
    const english = WORDS[i];
    const t0 = Date.now();
    const r = await api("/translate", {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ english, save: true }),
    });
    const ms = Date.now() - t0;
    const row = {
      english,
      ok: r.ok,
      status: r.status,
      ms,
      cache_hit: !!r.data.cache_hit,
      thai: r.data.translation?.thai_word || r.data.history?.thai_word || "",
      zh: r.data.translation?.chinese_traditional || r.data.history?.chinese_traditional || "",
      error: r.data.error || "",
      flags: {
        spelling_redirect: !!r.data.spelling_redirect,
        needs_confirm_spelling: !!r.data.needs_confirm_spelling,
        needs_new_sense: !!r.data.needs_new_sense,
        multiple_senses: !!r.data.multiple_senses,
      },
    };
    results.push(row);
    if (r.ok && (r.data.translation || r.data.history)) {
      ok += 1;
      if (r.data.cache_hit) cache += 1;
      console.log(
        `[${i + 1}/50] OK ${ms}ms` +
          (row.cache_hit ? " cache" : " ai") +
          ` | ${english} → ${row.thai} | ${row.zh}`
      );
    } else {
      fail += 1;
      console.log(`[${i + 1}/50] FAIL ${english}: ${row.error || r.status}`);
    }
  }

  const outPath = path.join(ROOT, "data", "test-daily-50-results.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      { at: new Date().toISOString(), ok, cache, fail, results },
      null,
      2
    ),
    "utf8"
  );
  console.log("\nSummary:", ok, "ok,", cache, "cache hits,", fail, "failed");
  console.log("Written:", outPath);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

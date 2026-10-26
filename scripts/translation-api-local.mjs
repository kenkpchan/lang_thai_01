/**
 * Local dev API (no Netlify CLI required).
 * Re-launches itself with .env applied at process start so Node fetch uses corporate proxy.
 *
 *   node scripts/translation-api-local.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const SELF = fileURLToPath(import.meta.url);

function parseDotEnv(envPath) {
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const text = fs.readFileSync(envPath, "utf8");
  text.split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || line.trimStart().startsWith("#")) return;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[m[1]] = val;
  });
  return out;
}

if (process.env.TRANSLATION_API_LAUNCHED !== "1") {
  const fromFile = parseDotEnv(path.join(ROOT, ".env"));
  const env = {
    ...process.env,
    ...fromFile,
    NODE_USE_ENV_PROXY: fromFile.NODE_USE_ENV_PROXY || process.env.NODE_USE_ENV_PROXY || "1",
    TRANSLATION_API_LAUNCHED: "1",
  };
  const child = spawn(process.execPath, [SELF], {
    env,
    stdio: "inherit",
    cwd: ROOT,
  });
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
} else {
  process.chdir(ROOT);
  process.env.TRANSLATION_HISTORY_FILE =
    process.env.TRANSLATION_HISTORY_FILE || path.join(ROOT, "data", "translation-history.json");
  process.env.CHALLENGE_TOPICS_FILE =
    process.env.CHALLENGE_TOPICS_FILE || path.join(ROOT, "data", "challenge-topics.json");

  const { handler: translateHandler } = await import("../netlify/functions/translate.mjs");
  const { handler: historyHandler } = await import("../netlify/functions/history.mjs");
  const { handler: linksHandler } = await import("../netlify/functions/links.mjs");
  const { handler: authHandler } = await import("../netlify/functions/auth.mjs");
  const { handler: reviewHandler } = await import("../netlify/functions/review.mjs");
  const { handler: challengeHandler } = await import("../netlify/functions/challenge.mjs");

  const PORT = Number(process.env.TRANSLATION_API_PORT) || 8765;

  function toLambdaEvent(req, bodyText) {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    return {
      httpMethod: req.method,
      body: bodyText || null,
      queryStringParameters: Object.fromEntries(url.searchParams),
      path: url.pathname,
      headers: {
        cookie: req.headers.cookie || "",
        authorization: req.headers.authorization || "",
        origin: req.headers.origin || "",
      },
    };
  }

  async function readBody(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    return Buffer.concat(chunks).toString("utf8");
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    let handler = null;
    if (url.pathname === "/api/translate") handler = translateHandler;
    if (url.pathname === "/api/history") handler = historyHandler;
    if (url.pathname === "/api/links") handler = linksHandler;
    if (url.pathname === "/api/auth") handler = authHandler;
    if (url.pathname === "/api/review") handler = reviewHandler;
    if (url.pathname === "/api/challenge") handler = challengeHandler;

    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    try {
      const bodyText = req.method === "GET" || req.method === "HEAD" ? "" : await readBody(req);
      const event = toLambdaEvent(req, bodyText);
      const out = await handler(event);
      const headers = { ...(out.headers || { "Content-Type": "application/json" }) };
      const setCookie = headers["Set-Cookie"];
      if (setCookie) {
        delete headers["Set-Cookie"];
        res.setHeader("Set-Cookie", setCookie);
      }
      res.writeHead(out.statusCode || 200, headers);
      res.end(out.body || "");
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message || "Server error" }));
    }
  });

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Translation API (local) http://127.0.0.1:${PORT}`);
    console.log("Challenge API: GET/PATCH/DELETE + saved POST on /api/challenge");
    console.log(`History file: ${process.env.TRANSLATION_HISTORY_FILE}`);
    console.log(`Proxy: ${process.env.HTTPS_PROXY || process.env.HTTP_PROXY || "(none)"}`);
    console.log(`DB mode: ${process.env.SUPABASE_URL ? "supabase" : "local-file"}`);
    console.log(`Open integrated-translation-vocab.html via a static server (e.g. npx serve -l 5180).`);
  });
}

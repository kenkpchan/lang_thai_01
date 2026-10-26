/**
 * Push variables from local .env to Netlify production (skips comments / blanks).
 * Usage: node scripts/netlify-sync-env.mjs
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "159929c5-0377-4a7f-88f4-cfb3214ed1d3";

const SECRET_KEYS = new Set([
  "OPENAI_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_BOOTSTRAP_PASSWORD",
  "AUTH_PASSWORD",
  "TAVILY_API_KEY",
  "AUTH_SESSION_SECRET",
]);

const SYNC_KEYS = [
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "OPENAI_MODEL",
  "TAVILY_API_KEY",
  "AUTH_BOOTSTRAP_USER",
  "AUTH_BOOTSTRAP_PASSWORD",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SITE_URL",
];

function findCli() {
  const npxRoot = path.join(process.env.LOCALAPPDATA ?? "", "npm-cache", "_npx");
  if (!fs.existsSync(npxRoot)) return null;
  for (const dir of fs.readdirSync(npxRoot)) {
    const cli = path.join(npxRoot, dir, "node_modules", "netlify-cli", "bin", "run.js");
    if (fs.existsSync(cli)) return cli;
  }
  return null;
}

function parseEnv(file) {
  const out = {};
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const cli = findCli();
if (!cli) {
  console.error("Run once: npx netlify-cli login");
  process.exit(1);
}

const env = parseEnv(path.join(ROOT, ".env"));
if (!env.SITE_URL) env.SITE_URL = "https://lang-thai-01.netlify.app";

for (const key of SYNC_KEYS) {
  const val = env[key];
  if (!val) continue;
  const args = [
    cli,
    "env:set",
    key,
    val,
    "--site",
    SITE,
    "--context",
    "production",
  ];
  if (SECRET_KEYS.has(key)) args.push("--secret");
  const r = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (r.status !== 0) {
    console.error(key, r.stderr || r.stdout);
    process.exit(r.status ?? 1);
  }
  console.log("set", key);
}

console.log("Done. Trigger a deploy for function env changes to apply.");

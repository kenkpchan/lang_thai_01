import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { hashPassword, verifyPassword, newSessionToken } from "./auth-crypto.mjs";

const USERS_FILE =
  process.env.AUTH_USERS_FILE || path.join(process.cwd(), "data", "app-users.json");
const SESSIONS_FILE =
  process.env.AUTH_SESSIONS_FILE || path.join(process.cwd(), "data", "app-sessions.json");

const SESSION_DAYS = 14;

function useSupabase() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function supabaseHeaders() {
  return {
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

function readJson(file, fallback) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    const data = JSON.parse(raw);
    return data;
  } catch (e) {
    if (e && e.code === "ENOENT") return fallback;
    throw e;
  }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

async function ensureBootstrapUser() {
  const user = process.env.AUTH_BOOTSTRAP_USER || process.env.AUTH_USERNAME;
  const pass = process.env.AUTH_BOOTSTRAP_PASSWORD || process.env.AUTH_PASSWORD;
  if (!user || !pass) return;

  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/app_users`;
    const res = await fetch(`${base}?select=id&limit=1`, { headers: supabaseHeaders() });
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows.length > 0) return;
    await fetch(base, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        username: user.trim(),
        password_hash: hashPassword(pass),
      }),
    });
    return;
  }

  const users = readJson(USERS_FILE, []);
  if (users.length > 0) return;
  users.push({
    id: randomUUID(),
    username: user.trim(),
    password_hash: hashPassword(pass),
    created_at: new Date().toISOString(),
  });
  writeJson(USERS_FILE, users);
}

/** @param {string} username */
export async function findUserByUsername(username) {
  await ensureBootstrapUser();
  const name = String(username || "").trim();
  if (!name) return null;

  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/app_users`;
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("username", `eq.${name}`);
    params.set("limit", "1");
    const res = await fetch(`${base}?${params}`, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data[0] : null;
  }

  const users = readJson(USERS_FILE, []);
  return users.find((u) => u.username === name) || null;
}

/**
 * @param {string} username
 * @param {string} password
 */
export async function verifyLogin(username, password) {
  const user = await findUserByUsername(username);
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  return user;
}

/** @param {string} userId */
export async function createSession(userId) {
  const token = newSessionToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();

  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/app_sessions`;
    const res = await fetch(url, {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({
        token,
        user_id: userId,
        expires_at: expires,
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.message || "Session create failed");
      err.code = "DB";
      throw err;
    }
    return { token, expires_at: expires };
  }

  const sessions = readJson(SESSIONS_FILE, []);
  sessions.unshift({
    id: randomUUID(),
    token,
    user_id: userId,
    expires_at: expires,
    created_at: new Date().toISOString(),
  });
  writeJson(SESSIONS_FILE, sessions.slice(0, 500));
  return { token, expires_at: expires };
}

/** @param {string} token */
export async function getSession(token) {
  if (!token) return null;
  const now = new Date().toISOString();

  if (useSupabase()) {
    const base = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/app_sessions`;
    const params = new URLSearchParams();
    params.set("select", "*");
    params.set("token", `eq.${token}`);
    params.set("expires_at", `gt.${now}`);
    params.set("limit", "1");
    const res = await fetch(`${base}?${params}`, { headers: supabaseHeaders() });
    const data = await res.json().catch(() => []);
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    const uRes = await fetch(
      `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/app_users?id=eq.${row.user_id}&select=username&limit=1`,
      { headers: supabaseHeaders() }
    );
    const uData = await uRes.json().catch(() => []);
    const username = Array.isArray(uData) && uData[0] ? uData[0].username : "";
    return {
      token: row.token,
      user_id: row.user_id,
      username,
      expires_at: row.expires_at,
    };
  }

  const sessions = readJson(SESSIONS_FILE, []);
  const row = sessions.find((s) => s.token === token && s.expires_at > now);
  if (!row) return null;
  const users = readJson(USERS_FILE, []);
  const user = users.find((u) => u.id === row.user_id);
  return {
    token: row.token,
    user_id: row.user_id,
    username: user?.username || "",
    expires_at: row.expires_at,
  };
}

/** @param {string} token */
export async function deleteSession(token) {
  if (!token) return;
  if (useSupabase()) {
    const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/app_sessions?token=eq.${encodeURIComponent(token)}`;
    await fetch(url, { method: "DELETE", headers: supabaseHeaders() });
    return;
  }
  writeJson(
    SESSIONS_FILE,
    readJson(SESSIONS_FILE, []).filter((s) => s.token !== token)
  );
}

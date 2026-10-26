/**
 * Create or update one app user (password hashed in DB file).
 * Usage: node scripts/seed-auth-user.mjs <username> <password>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { hashPassword } from "../netlify/functions/_lib/auth-crypto.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const USERS_FILE = path.join(ROOT, "data", "app-users.json");

const username = process.argv[2];
const password = process.argv[3];
if (!username || !password) {
  console.error("Usage: node scripts/seed-auth-user.mjs <username> <password>");
  process.exit(1);
}

let users = [];
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  if (!Array.isArray(users)) users = [];
} catch {
  users = [];
}

const hash = hashPassword(password);
const idx = users.findIndex((u) => u.username === username);
if (idx >= 0) {
  users[idx].password_hash = hash;
  console.log("Updated user:", username);
} else {
  users.push({
    id: randomUUID(),
    username,
    password_hash: hash,
    created_at: new Date().toISOString(),
  });
  console.log("Created user:", username);
}

fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");

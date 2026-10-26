/**
 * Smoke test Challenge API (login, list, generate, list again).
 * Usage: node scripts/test-challenge.mjs [username] [password]
 */
const API = `http://127.0.0.1:${process.env.TRANSLATION_API_PORT || 8765}/api`;
const user = process.argv[2] || "learner";
const pass = process.argv[3] || process.env.TV_TEST_PASSWORD || "";

if (!pass) {
  console.error(
    "Usage: node scripts/test-challenge.mjs <username> <password>\n" +
      "Or set TV_TEST_PASSWORD in the environment."
  );
  process.exit(1);
}

async function main() {
  let res = await fetch(`${API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: user, password: pass }),
  });
  const auth = await res.json();
  if (!res.ok) {
    console.error("Login failed:", auth.error || res.status);
    process.exit(1);
  }
  const headers = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Type": "application/json",
  };

  res = await fetch(`${API}/challenge?limit=3`, { headers });
  const list1 = await res.json();
  if (!res.ok) {
    console.error("GET /challenge failed:", list1.error || res.status);
    if (res.status === 405) {
      console.error(
        "Restart API: node scripts/translation-api-local.mjs (old process still on port 8765)"
      );
    }
    process.exit(1);
  }

  res = await fetch(`${API}/challenge`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      prompt: "Could I have a coffee with less sugar?",
      web_mode: "practice",
    }),
  });
  const gen = await res.json();
  if (!res.ok) {
    console.error("POST /challenge failed:", gen.error || res.status);
    process.exit(1);
  }
  if (!gen.id) {
    console.error("POST succeeded but no saved id — API may be outdated.");
    process.exit(1);
  }

  res = await fetch(`${API}/challenge?limit=5`, { headers });
  const list2 = await res.json();
  const count = (list2.items || []).length;
  console.log("OK challenge smoke test");
  console.log("  saved id:", gen.id);
  console.log("  sentences:", (gen.sentences || []).length);
  console.log("  library items:", count, "(was", (list1.items || []).length + ")");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
